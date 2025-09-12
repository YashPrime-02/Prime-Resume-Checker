// src/app/services/resume-review.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ResumeReviewService {
  // Hugging Face endpoints
  private embedUrl =
    'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';
  private classifyUrl =
    'https://api-inference.huggingface.co/models/facebook/bart-large-mnli';

  private headers = new HttpHeaders({
    Authorization: `Bearer ${environment.huggingFaceToken}`,
    'Content-Type': 'application/json',
  });

  // Simple in-memory cache to avoid repeated identical calls during a session
  private embeddingCache = new Map<string, number[]>();

  constructor(private http: HttpClient) {
    if (!environment.huggingFaceToken) {
      // Do not throw here — allow app to start, but network calls will fail later with better error messages.
      console.warn(
        'ResumeReviewService: huggingFaceToken is empty. Set environment.huggingFaceToken to use Hugging Face inference API.'
      );
    }
  }

  /**
   * Public: compare resume text to a role text using embeddings & cosine similarity.
   * Returns number between -1 and 1 (typically 0..1 for these embeddings).
   */
  async compareTexts(resume: string, role: string): Promise<number> {
    const trimmedResume = (resume || '').trim();
    const trimmedRole = (role || '').trim();

    if (!trimmedResume || !trimmedRole) {
      // If one of them is empty, similarity not defined -> return 0
      return 0;
    }

    const [resumeVec, roleVec] = await Promise.all([
      this.getEmbedding(trimmedResume),
      this.getEmbedding(trimmedRole),
    ]);

    return this.cosineSimilarity(resumeVec, roleVec);
  }

  /**
   * Public: auto-detect a best-fit role label using HF NLI classifier.
   * Returns the top label or a sensible default.
   */
  async detectRole(resume: string): Promise<string> {
    const candidateRoles = [
      'Frontend Developer',
      'Backend Developer',
      'Fullstack Developer',
      'Data Scientist',
      'Machine Learning Engineer',
      'DevOps Engineer',
      'UI/UX Designer',
      'Product Manager',
    ];

    const payload = {
      inputs: resume,
      parameters: { candidate_labels: candidateRoles },
    };

    // Retry a couple times for transient errors
    const maxAttempts = 3;
    let attempt = 0;
    let lastErr: unknown = null;

    while (attempt < maxAttempts) {
      try {
        const res$ = this.http.post<any>(this.classifyUrl, payload, {
          headers: this.headers,
        });
        const response = await lastValueFrom(res$);

        // Typical output: { labels: [...], scores: [...] }
        // Defensive: check several forms
        if (response?.labels && Array.isArray(response.labels) && response.labels.length) {
          return response.labels[0];
        }

        // Some HF endpoints might return single object with label/scores
        if (response?.label) {
          return response.label;
        }

        // If nothing sensible, break and fallback
        break;
      } catch (err) {
        lastErr = err;
        attempt++;
        // exponential backoff
        await this.sleep(200 * Math.pow(2, attempt));
      }
    }

    console.error('detectRole() failed', lastErr);
    // fallback
    return 'Software Engineer';
  }

  /**
   * INTERNAL: call HF embedding endpoint and return single numeric vector (number[]).
   * Handles nested array returns and caches results.
   */
  private async getEmbedding(text: string): Promise<number[]> {
    const key = text.slice(0, 200); // simple cache key (truncate for very long inputs)
    if (this.embeddingCache.has(key)) {
      return this.embeddingCache.get(key)!;
    }

    // prepare payload
    const payload = { inputs: text };

    const maxAttempts = 3;
    let attempt = 0;
    let lastErr: unknown = null;

    while (attempt < maxAttempts) {
      try {
        const res$ = this.http.post<any>(this.embedUrl, payload, {
          headers: this.headers,
        });
        const response = await lastValueFrom(res$);

        // Defensive parse — HF embedding endpoint can return many shapes:
        //  - [number, number, ...]
        //  - [[number, number, ...]]
        //  - [[[number, ...]]]
        // We search the response to find the first numeric array we can treat as vector.
        const vector = this.findFirstNumericArray(response);
        if (!vector || !vector.length) {
          throw new Error('Embedding response did not contain numeric vector');
        }

        // Cache and return
        this.embeddingCache.set(key, vector);
        return vector;
      } catch (err) {
        lastErr = err;
        attempt++;
        // short exponential backoff between attempts
        await this.sleep(250 * Math.pow(2, attempt));
      }
    }

    // All attempts failed
    console.error('getEmbedding failed for text (first 200 chars):', key, lastErr);
    throw new Error('Failed to get text embedding from Hugging Face API');
  }

  /**
   * INTERNAL: find first numeric array in nested response
   */
  private findFirstNumericArray(obj: any): number[] | null {
    if (!obj) return null;

    // If obj itself is an array of numbers
    if (Array.isArray(obj) && obj.length && typeof obj[0] === 'number') {
      return obj as number[];
    }

    // If obj is array, dive in
    if (Array.isArray(obj) && obj.length) {
      return this.findFirstNumericArray(obj[0]);
    }

    // If obj is object with a '0' property (rare), try that
    if (typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        const res = this.findFirstNumericArray((obj as any)[k]);
        if (res) return res;
      }
    }

    return null;
  }

  /**
   * Cosine similarity with guards
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) {
      return 0;
    }
    // If lengths differ, trim to shortest
    const n = Math.min(a.length, b.length);
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < n; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  /** small util */
  private sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }
}
