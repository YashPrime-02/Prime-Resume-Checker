import { Component, OnInit } from '@angular/core';
import { ResumeReviewService, RoleSuggestion } from './resume-review.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-resume-review',
  imports: [CommonModule],
  templateUrl: './resume-review.html',
  styleUrls: ['./resume-review.scss'],
  standalone: true,
})
export class ResumeReviewComponent implements OnInit {
  progress = 0;
  detectedRole = '';
  similarityScore = 0;

  // top suggestions displayed in UI
  suggestions: RoleSuggestion[] = [];

  // Messages to rotate
  displayedMessages: string[] = [
    '🔍 Scanning your resume...',
    '📑 Extracting key skills...',
    '🤖 Matching with AI knowledge base...',
    '📊 Calculating similarity scores...',
    '✅ Preparing final results...'
  ];
  currentMessageIndex = 0;

  constructor(private resumeService: ResumeReviewService) {}

  ngOnInit() {
    this.startScanning();
  }

  async startScanning() {
    const resume = (localStorage.getItem('uploadedResume') || '').trim();

    // Guard early
    if (!resume) {
      this.progress = 100;
      this.detectedRole = 'No resume uploaded';
      this.similarityScore = 0;
      this.suggestions = [];
      return;
    }

    // progress + messages
    const interval = setInterval(() => {
      if (this.progress < 100) {
        this.progress += 2;
        if (this.progress % 20 === 0 && this.currentMessageIndex < this.displayedMessages.length - 1) {
          this.currentMessageIndex++;
        }
      } else {
        clearInterval(interval);
      }
    }, 200);

    try {
      // Get suggestions with classifier score + similarity
      const roles = await this.resumeService.getRoleSuggestions(resume, 3);

      this.suggestions = roles.map(r => ({
        label: r.label,
        classifierScore: r.classifierScore,
        similarity: r.similarity
      }));

      if (this.suggestions.length) {
        // best fit = highest similarity (service already sorts by similarity)
        const best = this.suggestions[0];
        this.detectedRole = best.label;
        this.similarityScore = Math.round(best.similarity * 100);
      } else {
        this.detectedRole = 'Unknown';
        this.similarityScore = 0;
      }

    } catch (error) {
      console.error('Resume review failed', error);
      this.detectedRole = 'Unknown';
      this.similarityScore = 0;
      this.suggestions = [];
    } finally {
      // ensure progress reaches 100
      this.progress = 100;
    }
  }
}
