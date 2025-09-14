import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import * as mammoth from 'mammoth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatIconModule,
    MatButtonModule,
    PdfViewerModule,
  ],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss'],
})
export class UploadComponent implements OnInit {
  resumeText: string = '';
  selectedFile: File | null = null;
  fileName: string | null = null;
  isLoading: boolean = false;
  pdfSrc: Uint8Array | null = null;
  hasResume: boolean = false;

  private parseTimeout: number | null = null;
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  ngOnInit() {
    // Restore previous resume if present
    const savedResume = localStorage.getItem('resumeText');
    if (savedResume) {
      this.resumeText = savedResume;
    }
    this.updateHasResume();
  }

  goToResumeReview() {
    if (!this.resumeText.trim()) return;

    // Save resume for review page
    localStorage.setItem('resumeText', this.resumeText);
    localStorage.setItem('uploadedResume', this.resumeText);
    this.hasResume = true;
    this.router.navigate(['/resume-review']);
  }

  async onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.selectedFile = file;
    this.fileName = file.name;
    this.isLoading = true;
    this.saveFileToLocalStorage(file);

    this.resetTimeout();
    this.parseTimeout = window.setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
        this.showError('File processing timed out. Please try again.');
      }
    }, 6000);

    try {
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = (e) => {
          this.clearTimeout();
          this.resumeText = (e.target?.result as string) || '';
          localStorage.setItem('resumeText', this.resumeText);
          localStorage.setItem('uploadedResume', this.resumeText);
          this.updateHasResume();
          this.isLoading = false;
          this.showToast('TXT file loaded successfully');
        };
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        this.pdfSrc = new Uint8Array(arrayBuffer);
        // PDF text will be extracted by onPdfLoad when viewer renders
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword' ||
        file.name.endsWith('.docx') ||
        file.name.endsWith('.doc')
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });

        this.clearTimeout();
        this.resumeText = result.value.trim();
        localStorage.setItem('resumeText', this.resumeText);
        localStorage.setItem('uploadedResume', this.resumeText);
        this.updateHasResume();
        this.isLoading = false;
        this.showToast('DOC/DOCX file loaded successfully');
      } else {
        this.clearTimeout();
        this.isLoading = false;
        this.showError('Unsupported file format. Please upload .txt, .pdf, .doc or .docx');
      }
    } catch (error: unknown) {
      this.clearTimeout();
      console.error('Parsing error:', error);
      this.isLoading = false;
      this.showError('Error reading file. Please try a different file.');
    }
  }

  async onPdfLoad(pdf: any) {
    this.clearTimeout();
    try {
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ') + '\n';
      }
      this.resumeText = text.trim();
      localStorage.setItem('resumeText', this.resumeText);
      localStorage.setItem('uploadedResume', this.resumeText);
      this.updateHasResume();
      this.isLoading = false;
      this.showToast('PDF file parsed successfully');
    } catch (error: unknown) {
      console.error('PDF parsing error:', error);
      this.isLoading = false;
      this.showError('Error parsing PDF. Please try again.');
    }
  }

  clearText() {
    this.resumeText = '';
    this.selectedFile = null;
    this.pdfSrc = null;
    this.fileName = null;
    this.hasResume = false;
    localStorage.removeItem('resumeText');
    localStorage.removeItem('uploadedResume');
    localStorage.removeItem('resumeFile');
    localStorage.removeItem('resumeFileName');
    this.clearTimeout();
    this.showToast('Cleared resume text');
  }

  public updateHasResume() {
    // Only enable if resumeText is present and non-empty
    this.hasResume = !!(this.resumeText && this.resumeText.trim().length > 0);
  }

  private saveFileToLocalStorage(file: File) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      localStorage.setItem('resumeFile', reader.result as string);
      localStorage.setItem('resumeFileName', file.name);
    };
  }

  private resetTimeout() {
    if (this.parseTimeout) {
      window.clearTimeout(this.parseTimeout);
      this.parseTimeout = null;
    }
  }

  private clearTimeout() {
    if (this.parseTimeout) {
      window.clearTimeout(this.parseTimeout);
      this.parseTimeout = null;
    }
  }

  private showToast(message: string) {
    this.snackBar.open(message, 'OK', {
      duration: 3000,
      panelClass: ['toast-success'],
      verticalPosition: 'top',
      horizontalPosition: 'center',
    });
  }

  private showError(message: string) {
    this.snackBar.open(message, 'Dismiss', {
      duration: 4000,
      panelClass: ['toast-error'],
      verticalPosition: 'top',
      horizontalPosition: 'center',
    });
  }
}
