// src/app/services/resume-review.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ClassificationResult {
  label: string;
  score: number; // classifier confidence 0..1
}

export interface RoleSuggestion {
  label: string;
  classifierScore: number; // 0..1
  similarity: number; // 0..1 (embedding similarity)
}

@Injectable({
  providedIn: 'root',
})
export class ResumeReviewService {
  // Hugging Face endpoints
  private embedUrl =
    'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';
  private classifyUrl =
    'https://api-inference.huggingface.co/models/facebook/bart-large-mnli';
  private summarizerUrl =
    'https://api-inference.huggingface.co/models/facebook/bart-large-cnn';

  private headers = new HttpHeaders({
    Authorization: `Bearer ${environment.huggingFaceToken}`,
    'Content-Type': 'application/json',
  });

  // Simple in-memory cache
  private embeddingCache = new Map<string, number[]>();

  constructor(private http: HttpClient) {
    if (!environment.huggingFaceToken) {
      console.warn(
        'ResumeReviewService: huggingFaceToken is empty. Set environment.huggingFaceToken to use Hugging Face inference API.'
      );
    }
  }

  /**
   * Build a dynamic candidate role list by scanning resume text for role-like keywords.
   * Returns an array (may be empty).
   */
  private extractRoleKeywords(text: string): string[] {
    if (!text) return [];

    const t = text.toLowerCase();

    const mapping: Record<string, string> = {
      frontend: 'Frontend Developer',
      'front-end': 'Frontend Developer',
      backend: 'Backend Developer',
      'back-end': 'Backend Developer',
      fullstack: 'Fullstack Developer',
      'full-stack': 'Fullstack Developer',
      'machine learning': 'Machine Learning Engineer',
      ml: 'Machine Learning Engineer',
      'data science': 'Data Scientist',
      'data scientist': 'Data Scientist',
      data: 'Data Scientist',
      devops: 'DevOps Engineer',
      'dev ops': 'DevOps Engineer',
      ux: 'UI/UX Designer',
      ui: 'UI/UX Designer',
      'product manager': 'Product Manager',
      product: 'Product Manager',
      cloud: 'Cloud Engineer',
      aws: 'Cloud Engineer',
      gcp: 'Cloud Engineer',
      azure: 'Cloud Engineer',
      qa: 'QA Engineer',
      test: 'QA Engineer',
      android: 'Mobile App Developer',
      ios: 'Mobile App Developer',
      mobile: 'Mobile App Developer',
      security: 'Cybersecurity Specialist',
      cybersecurity: 'Cybersecurity Specialist',
      analyst: 'Business Analyst',
      database: 'Database Administrator',
      sql: 'Database Administrator',
      ai: 'AI Researcher',
      researcher: 'AI Researcher',
    };

    const found = new Set<string>();
    for (const key of Object.keys(mapping)) {
      if (t.includes(key)) {
        found.add(mapping[key]);
      }
    }

    return Array.from(found);
  }

  /**
   * Summarize resume (short) to reduce payload to classifier.
   * If summarizer fails, fallback to full resume text.
   */
  private async summarizeText(text: string): Promise<string> {
    if (!text || !text.trim()) return '';

    try {
      const payload = { inputs: text, parameters: { max_length: 60 } };
      const res$ = this.http.post<any>(this.summarizerUrl, payload, {
        headers: this.headers,
      });
      const response = await lastValueFrom(res$);

      // Many summarizers return array with { summary_text: '...' }
      if (Array.isArray(response) && response[0]?.summary_text) {
        return response[0].summary_text as string;
      }
      // Some endpoints may return object with summary_text
      if (response?.summary_text) return response.summary_text;
    } catch (err) {
      // ignore and fallback
      console.warn('summarizeText() failed, using original resume', err);
    }
    return text;
  }

  /**
   * Detect candidate roles using zero-shot classification.
   * Returns an array of {label, score} (sorted by score desc).
   */
  async detectRoles(resume: string, maxCandidates = 5): Promise<ClassificationResult[]> {
    if (!resume || !resume.trim()) return [{ label: 'Unknown', score: 0 }];

    // Build dynamic candidate list: extracted keywords + fallback list
    const defaults = [
      'Frontend Developer',
      'Backend Developer',
      'Fullstack Developer',
      'Data Scientist',
      'Machine Learning Engineer',
      'DevOps Engineer',
      'UI/UX Designer',
      'Product Manager',
      'Software Engineer',
      'Cloud Engineer',
      'QA Engineer',
      'Mobile App Developer',
      'Cybersecurity Specialist',
      'Business Analyst',
      'Database Administrator',
      'AI Researcher',
    ];

    const extracted = this.extractRoleKeywords(resume);
    // ensure unique, extracted first for priority
    const candidateRoles = Array.from(new Set([...extracted, ...defaults]));

    // compress resume (summarize) before classifying
    const summary = await this.summarizeText(resume);

    const payload = {
      inputs: summary || resume,
      parameters: {
        candidate_labels: candidateRoles,
        multi_label: true,
      },
    };

    const maxAttempts = 3;
    let attempt = 0;
    let lastErr: unknown = null;

    while (attempt < maxAttempts) {
      try {
        const res$ = this.http.post<any>(this.classifyUrl, payload, { headers: this.headers });
        const response = await lastValueFrom(res$);

        if (response?.labels && response?.scores) {
          const results: ClassificationResult[] = response.labels.map(
            (label: string, i: number) => ({ label, score: response.scores[i] })
          );

          // sort by classifier confidence desc and return topN
          return results.sort((a, b) => b.score - a.score).slice(0, maxCandidates);
        }

        break;
      } catch (err) {
        lastErr = err;
        attempt++;
        await this.sleep(200 * Math.pow(2, attempt));
      }
    }

    console.error('detectRoles() failed', lastErr);
    // sensible fallback
    return [{ label: 'Software Engineer', score: 0.3 }];
  }

  /**
   * Returns top role suggestions with both classifier confidence and
   * embedding similarity (0..1). Sorted by similarity desc.
   */
  async getRoleSuggestions(resume: string, topK = 3): Promise<RoleSuggestion[]> {
    if (!resume || !resume.trim()) return [{ label: 'Unknown', classifierScore: 0, similarity: 0 }];

    // Step 1: get classifier candidate roles (label + classifier score)
    const candidates = await this.detectRoles(resume, topK);

    // Step 2: compute embeddings and similarity per candidate
    const resumeEmbedding = await this.getEmbedding(resume);

    const suggestions: RoleSuggestion[] = [];
    for (const c of candidates) {
      try {
        const roleEmbedding = await this.getEmbedding(c.label);
        const similarity = this.cosineSimilarity(resumeEmbedding, roleEmbedding);
        suggestions.push({ label: c.label, classifierScore: c.score, similarity });
      } catch (err) {
        // If embedding for role fails, set similarity 0
        suggestions.push({ label: c.label, classifierScore: c.score, similarity: 0 });
      }
    }

    // sort by similarity desc
    return suggestions.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  }

  /**
   * Compare resume text to a role text using embeddings & cosine similarity.
   */
  async compareTexts(resume: string, role: string): Promise<number> {
    const trimmedResume = (resume || '').trim();
    const trimmedRole = (role || '').trim();
    if (!trimmedResume || !trimmedRole) return 0;

    const [resumeVec, roleVec] = await Promise.all([
      this.getEmbedding(trimmedResume),
      this.getEmbedding(trimmedRole),
    ]);
    return this.cosineSimilarity(resumeVec, roleVec);
  }

  /** INTERNAL: call HF embedding endpoint */
  private async getEmbedding(text: string): Promise<number[]> {
    const key = text.slice(0, 200);
    if (this.embeddingCache.has(key)) {
      return this.embeddingCache.get(key)!;
    }

    // HF embeddings expect array of strings
    const payload = { inputs: [text] };

    const maxAttempts = 3;
    let attempt = 0;
    let lastErr: unknown = null;

    while (attempt < maxAttempts) {
      try {
        const res$ = this.http.post<any>(this.embedUrl, payload, { headers: this.headers });
        const response = await lastValueFrom(res$);
        const vector = this.findFirstNumericArray(response);
        if (!vector?.length) {
          throw new Error('Embedding response did not contain numeric vector');
        }
        this.embeddingCache.set(key, vector);
        return vector;
      } catch (err) {
        lastErr = err;
        attempt++;
        await this.sleep(250 * Math.pow(2, attempt));
      }
    }

    console.error('getEmbedding failed for text:', key, lastErr);
    throw new Error('Failed to get text embedding from Hugging Face API');
  }

  /** INTERNAL: find first numeric array in nested response */
  private findFirstNumericArray(obj: any): number[] | null {
    if (!obj) return null;
    if (Array.isArray(obj) && obj.length && typeof obj[0] === 'number') {
      return obj as number[];
    }
    if (Array.isArray(obj) && obj.length) {
      return this.findFirstNumericArray(obj[0]);
    }
    if (typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        const res = this.findFirstNumericArray((obj as any)[k]);
        if (res) return res;
      }
    }
    return null;
  }

  /** Cosine similarity */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (!Array.isArray(a) || !Array.isArray(b) || !a.length || !b.length) {
      return 0;
    }
    const n = Math.min(a.length, b.length);
    let dot = 0,
      na = 0,
      nb = 0;
    for (let i = 0; i < n; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
  }

  private sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }
}
