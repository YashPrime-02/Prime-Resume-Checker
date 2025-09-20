// src/app/services/resume-review.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { GoogleGenerativeAI } from '@google/generative-ai'; // npm install @google/generative-ai
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
  private genAI: GoogleGenerativeAI | null = null;
  private generativeModel = 'gemini-1.5-flash'; // Free tier model; swap to 'gemini-2.0-pro' for advanced if needed

  // Free public jobs API for latest roles (no auth, CORS-friendly)
  private jobsApiUrl = 'https://remoteok.io/api';

  // Role descriptions for better similarity matching
  private roleDescriptions: Record<string, string> = {
    'Frontend Developer': 'Develops user interfaces using HTML, CSS, JavaScript, React, Vue.',
    'Backend Developer': 'Builds server-side logic, APIs, databases with Node.js, Python, Java.',
    'Fullstack Developer': 'Handles both frontend and backend development, full application stack.',
    'Data Scientist': 'Analyzes data, builds models using Python, R, SQL, machine learning.',
    'Machine Learning Engineer': 'Deploys ML models, works with TensorFlow, PyTorch, data pipelines.',
    'DevOps Engineer': 'Manages CI/CD, cloud infrastructure, Docker, Kubernetes, AWS.',
    'UI/UX Designer': 'Designs user interfaces, wireframes, prototypes with Figma, Adobe XD.',
    'Product Manager': 'Oversees product lifecycle, user research, agile methodologies.',
    'Software Engineer': 'Writes, tests, maintains software code in various languages.',
    'Cloud Engineer': 'Manages cloud services like AWS, Azure, GCP, infrastructure as code.',
    'QA Engineer': 'Tests software, automation with Selenium, writes test cases.',
    'Mobile App Developer': 'Builds iOS/Android apps with Swift, Kotlin, React Native.',
    'Cybersecurity Specialist': 'Protects systems, ethical hacking, firewalls, compliance.',
    'Business Analyst': 'Gathers requirements, process modeling, stakeholder communication.',
    'Database Administrator': 'Manages databases, SQL/NoSQL, performance tuning, backups.',
    'AI Researcher': 'Conducts research in artificial intelligence, papers, algorithms.',
  };

  private requestCount = 0;
  private readonly maxRequests = 45;

  constructor(private http: HttpClient) {
    if (!environment.googleApiKey) {
      console.warn(
        'ResumeReviewService: googleApiKey is empty. Set environment.googleApiKey from Google AI Studio for Gemini API.'
      );
      return;
    }
    this.genAI = new GoogleGenerativeAI(environment.googleApiKey);
  }

  /**
   * Check and increment request count; throw if limit exceeded.
   */
  private async checkLimit(): Promise<void> {
    this.requestCount++;
    if (this.requestCount > this.maxRequests) {
      throw new Error('Max limit used: Daily request quota exceeded (45 requests). Please try again tomorrow or upgrade to a paid plan.');
    }
  }

  /**
   * Fetch latest job titles from free public API for dynamic role candidates.
   * Returns unique array (falls back to defaults if fetch fails).
   */
  private async fetchLatestRoles(maxRoles = 20): Promise<string[]> {
    const defaults = Object.keys(this.roleDescriptions);

    try {
      const params = new HttpHeaders({
        'Content-Type': 'application/json',
      });
      const url = `${this.jobsApiUrl}`;
      const res$ = this.http.get<any>(url, { headers: params });
      const response = await lastValueFrom(res$);

      // Response shape: array of jobs [{ position: string, ... }, ...]
      const jobs = Array.isArray(response) ? response : [];
      const roles = jobs
        .map((job: any) => (job.position || job.title || '').trim())
        .filter((title: string) => title && title.length > 5 && !title.includes('(')) // Filter noise, e.g., remote tags
        .slice(0, maxRoles);

      // Unique + prioritize fresh ones
      return Array.from(new Set(roles));
    } catch (err) {
      console.warn('fetchLatestRoles() failed, using defaults', err);
      return defaults;
    }
  }

  /**
   * Build a dynamic candidate role list: internet-fetched + extracted keywords + defaults.
   * Returns an array (may be empty).
   */
  private async extractRoleKeywords(text: string): Promise<string[]> {
    if (!text) return [];

    // Simple keyword extraction
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

    // Augment with latest from internet
    const latest = await this.fetchLatestRoles(10);
    return Array.from(new Set([...Array.from(found), ...latest]));
  }

  /**
   * Summarize resume (short) to reduce payload to classifier.
   * If summarizer fails, fallback to full resume text.
   */
  private async summarizeText(text: string): Promise<string> {
    if (!text || !text.trim() || !this.genAI) return '';

    try {
      await this.checkLimit();
      const model = this.genAI.getGenerativeModel({ model: this.generativeModel });
      const prompt = `Summarize the following resume in 1-2 sentences, focusing on key skills, experience, and role fit. Keep under 60 words: ${text}`;
      const result = await model.generateContent(prompt);
      const summary = result.response.text().trim();
      return summary || text; // Fallback if empty
    } catch (err) {
      if (err instanceof Error && err.message.includes('Max limit used')) {
        throw err; // Re-throw limit error
      }
      console.warn('summarizeText() failed, using original resume', err);
      return text;
    }
  }

  /**
   * Detect candidate roles using zero-shot classification via Gemini prompt.
   * Returns an array of {label, score} (sorted by score desc).
   */
  async detectRoles(resume: string, maxCandidates = 5): Promise<ClassificationResult[]> {
    if (!resume || !resume.trim() || !this.genAI) return [{ label: 'Unknown', score: 0 }];

    const extracted = await this.extractRoleKeywords(resume);
    const defaults = Object.keys(this.roleDescriptions);
    const candidateRoles = Array.from(new Set([...extracted, ...defaults])).slice(0, maxCandidates * 2);

    const summary = await this.summarizeText(resume);

    const prompt = `Classify this resume summary into the best-fitting roles from this list: ${candidateRoles.join(', ')}.
    Output ONLY valid JSON array of objects like [{"label": "Role Name", "score": 0.95}, ...] where score is 0-1 confidence. Sort by score descending. Limit to top ${maxCandidates}.
    Summary: ${summary || resume}`;

    try {
      await this.checkLimit();
      const model = this.genAI.getGenerativeModel({ model: this.generativeModel });
      const result = await model.generateContent(prompt);
      let responseText = result.response.text().trim();

      // Strip markdown code blocks
      let jsonStr = responseText.replace(/```(?:json)?\s*/g, '').replace(/```$/g, '').trim();
      if (!jsonStr.startsWith('[')) {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        jsonStr = jsonMatch ? jsonMatch[0].trim() : responseText;
      }

      const parsed = JSON.parse(jsonStr) as ClassificationResult[];
      if (parsed && Array.isArray(parsed)) {
        return parsed.slice(0, maxCandidates);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Max limit used')) {
        throw err;
      }
      console.warn('Gemini classification parse failed', err);
    }

    return [{ label: 'Software Engineer', score: 0.3 }];
  }

  /**
   * Returns top role suggestions with both classifier confidence and
   * embedding similarity (0..1). Picks maximum of the two scores for ranking.
   */
  async getRoleSuggestions(resume: string, topK = 3): Promise<RoleSuggestion[]> {
    if (!resume || !resume.trim() || !this.genAI)
      return [{ label: 'Unknown', classifierScore: 0, similarity: 0 }];

    const candidates = await this.detectRoles(resume, topK);

    const suggestions: (RoleSuggestion & { maxScore: number })[] = [];
    for (const c of candidates) {
      try {
        const roleDesc = this.roleDescriptions[c.label] || c.label;
        const similarity = this.jaccardSimilarity(resume, roleDesc);
        const maxScore = Math.max(c.score, similarity);
        suggestions.push({ label: c.label, classifierScore: c.score, similarity, maxScore });
      } catch (err) {
        suggestions.push({ label: c.label, classifierScore: c.score, similarity: 0, maxScore: c.score });
      }
    }

    return suggestions
      .sort((a, b) => b.maxScore - a.maxScore)
      .slice(0, topK)
      .map(s => ({ label: s.label, classifierScore: s.classifierScore, similarity: s.similarity }));
  }

  /**
   * Compare resume text to a role text using Jaccard similarity (set overlap).
   */
  async compareTexts(resume: string, role: string): Promise<number> {
    const trimmedResume = (resume || '').trim();
    const trimmedRole = (role || '').trim();
    if (!trimmedResume || !trimmedRole || !this.genAI) return 0;

    const roleDesc = this.roleDescriptions[trimmedRole] || trimmedRole;
    return this.jaccardSimilarity(trimmedResume, roleDesc);
  }

  /** Jaccard similarity (word set overlap) - quota-free local metric */
  private jaccardSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const intersect = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    return union.size ? intersect.size / union.size : 0;
  }

  private sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }
}
