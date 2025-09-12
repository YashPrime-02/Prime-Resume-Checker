import { Component, OnInit } from '@angular/core';
import { ResumeReviewService } from './resume-review.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-resume-review',
  imports:[CommonModule],
  templateUrl: './resume-review.html',
  styleUrls: ['./resume-review.scss']
})
export class ResumeReviewComponent implements OnInit {
  progress = 0;
  detectedRole = '';
  similarityScore = 0;

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
    const resume = localStorage.getItem('uploadedResume') || '';

    // Progress + message updates
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
      // Auto-detect role
      this.detectedRole = await this.resumeService.detectRole(resume);

      // Compare similarity
      this.similarityScore = await this.resumeService.compareTexts(
        resume,
        this.detectedRole
      );
    } catch (error) {
      console.error('Resume review failed', error);
      this.detectedRole = 'Unknown';
      this.similarityScore = 0;
    }
  }
}
