import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import * as mammoth from 'mammoth';

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

  private parseTimeout: number | null = null;
  private snackBar = inject(MatSnackBar);

  ngOnInit() {
    const savedResume = localStorage.getItem('resumeText');
    if (savedResume) {
      this.resumeText = savedResume;
    }

    const savedFileName = localStorage.getItem('resumeFileName');
    if (savedFileName) {
      this.fileName = savedFileName;
    }
  }

  async onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.selectedFile = file;
    this.fileName = file.name;

    // save raw file in localStorage (base64)
    this.saveFileToLocalStorage(file);

    const fileType = file.type;
    this.isLoading = true;

    if (this.parseTimeout) {
      window.clearTimeout(this.parseTimeout);
      this.parseTimeout = null;
    }
    this.parseTimeout = window.setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
        this.showError('File processing timed out. Please try again.');
      }
    }, 15000);

    try {
      if (fileType === 'text/plain' || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = (e) => {
          this.clearTimeout();
          this.resumeText = e.target?.result as string;
          localStorage.setItem('resumeText', this.resumeText);
          this.isLoading = false;
          this.showToast('TXT file loaded successfully');
        };
        reader.onerror = () => {
          this.clearTimeout();
          this.isLoading = false;
          this.showError('Error reading TXT file.');
        };
      } else if (fileType === 'application/pdf' || file.name.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        this.pdfSrc = new Uint8Array(arrayBuffer);
      } else if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileType === 'application/msword' ||
        file.name.endsWith('.docx') ||
        file.name.endsWith('.doc')
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });

        this.clearTimeout();
        this.resumeText = result.value.trim();
        localStorage.setItem('resumeText', this.resumeText);
        this.isLoading = false;
        this.showToast('DOC/DOCX file loaded successfully');
      } else {
        this.clearTimeout();
        this.isLoading = false;
        this.showError('Unsupported file format. Please upload .txt, .pdf, or .doc/.docx');
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
      this.isLoading = false;
      this.showToast('PDF file parsed successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('PDF parsing error:', error);
      this.isLoading = false;
      this.showError(`Error parsing PDF: ${errorMessage}`);
    }
  }

  clearText() {
    this.resumeText = '';
    this.selectedFile = null;
    this.pdfSrc = null;
    this.fileName = null;
    localStorage.removeItem('resumeText');
    localStorage.removeItem('resumeFile');
    localStorage.removeItem('resumeFileName');
    this.clearTimeout();
    this.showToast('Cleared resume text');
  }

  private saveFileToLocalStorage(file: File) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      localStorage.setItem('resumeFile', reader.result as string);
      localStorage.setItem('resumeFileName', file.name);
    };
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
