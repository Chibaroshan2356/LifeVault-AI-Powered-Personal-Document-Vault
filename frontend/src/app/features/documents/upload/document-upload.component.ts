/**
 * DocumentUploadComponent — File Upload Page
 *
 * Features:
 *  - Drag-and-drop zone + file picker fallback
 *  - File type and size validation client-side (mirrors backend rules)
 *  - Upload progress bar
 *  - Clear success/error feedback
 *  - After upload: navigate to document list
 */
import {
  Component, ElementRef, ViewChild, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule }           from '@angular/material/icon';
import { MatButtonModule }         from '@angular/material/button';
import { MatProgressBarModule }    from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { DocumentService } from '../services/document.service';

const ALLOWED_TYPES    = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_LABELS   = 'PDF, JPG, PNG';
const MAX_SIZE_BYTES   = 10 * 1024 * 1024;
const MAX_SIZE_LABEL   = '10 MB';

@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatIconModule, MatButtonModule,
    MatProgressBarModule, MatSnackBarModule,
  ],
  templateUrl: './document-upload.component.html',
  styleUrl:    './document-upload.component.scss',
})
export class DocumentUploadComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  isDragOver    = false;
  selectedFile: File | null = null;
  validationError = '';
  uploadState: 'idle' | 'uploading' | 'success' | 'error' = 'idle';
  uploadPercent = 0;

  readonly allowedLabels = ALLOWED_LABELS;
  readonly maxSizeLabel  = MAX_SIZE_LABEL;

  constructor(
    private readonly docService: DocumentService,
    private readonly router:     Router,
    private readonly snackbar:   MatSnackBar,
  ) {}

  // ── Drag & Drop ────────────────────────────────────────────────

  @HostListener('dragover', ['$event'])
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver = true;
  }

  @HostListener('dragleave')
  onDragLeave(): void { this.isDragOver = false; }

  @HostListener('drop', ['$event'])
  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver = false;
    const file = e.dataTransfer?.files[0];
    if (file) this.selectFile(file);
  }

  // ── File Selection ─────────────────────────────────────────────

  openFilePicker(): void { this.fileInput.nativeElement.click(); }

  onFileInputChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.selectFile(file);
  }

  selectFile(file: File): void {
    this.validationError = '';
    this.selectedFile    = null;

    if (!ALLOWED_TYPES.includes(file.type)) {
      this.validationError = `Unsupported file type. Please upload ${ALLOWED_LABELS}.`;
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      this.validationError = `File is too large. Maximum size is ${MAX_SIZE_LABEL}.`;
      return;
    }
    if (file.size === 0) {
      this.validationError = 'File is empty.';
      return;
    }

    this.selectedFile = file;
  }

  clearSelection(): void {
    this.selectedFile    = null;
    this.validationError = '';
    this.uploadState     = 'idle';
    this.uploadPercent   = 0;
    this.fileInput.nativeElement.value = '';
  }

  // ── Upload ─────────────────────────────────────────────────────

  upload(): void {
    if (!this.selectedFile) return;

    this.uploadState   = 'uploading';
    this.uploadPercent = 0;

    this.docService.upload(this.selectedFile).subscribe({
      next: (event) => {
        if (event.type === 'progress') {
          this.uploadPercent = event.percent ?? 0;
        }
        if (event.type === 'complete') {
          this.uploadState = 'success';
          this.snackbar.open('Document uploaded successfully!', 'View', {
            duration:           4000,
            panelClass:         ['snackbar-success'],
            horizontalPosition: 'right',
            verticalPosition:   'top',
          });
          setTimeout(() => this.router.navigate(['/documents']), 1500);
        }
      },
      error: (err) => {
        this.uploadState = 'error';
        const msg = err?.error?.message ?? 'Upload failed. Please try again.';
        this.snackbar.open(msg, 'Dismiss', {
          duration:           5000,
          panelClass:         ['snackbar-error'],
          horizontalPosition: 'right',
          verticalPosition:   'top',
        });
      },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────

  get fileIcon(): string {
    if (!this.selectedFile) return 'insert_drive_file';
    if (this.selectedFile.type === 'application/pdf') return 'picture_as_pdf';
    return 'image';
  }

  get fileSizeLabel(): string {
    if (!this.selectedFile) return '';
    const kb = this.selectedFile.size / 1024;
    return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`;
  }
}
