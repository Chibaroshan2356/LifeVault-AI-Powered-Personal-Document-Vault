import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TrainingDocumentService, AIProcessResult } from '../services/training-document.service';
import { DocumentService } from '../services/document.service';
import { DocumentCategory } from '../models/document.models';
import { environment } from '../../../../environments/environment';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

@Component({
  selector: 'app-document-training',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './document-training.component.html',
  styleUrl: './document-training.component.scss',
})
export class DocumentTrainingComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Dropdown categories
  categories = Object.values(DocumentCategory);

  // File variables
  selectedFile: File | null = null;
  filePreviewUrl: SafeResourceUrl | null = null;
  fileType: 'pdf' | 'image' | 'unknown' = 'unknown';

  // State
  isLoading = false;
  hasResult = false;
  validationError = '';

  // Data from AI
  storagePath = '';
  ocrText = '';
  aiCategory = '';
  aiConfidence = 0;
  aiMetadata: any = {};
  aiVersionInfo: any = {};

  // Form inputs
  formCategory = '';
  formHolder = '';
  formOrganization = '';
  formDocumentName = '';
  formDocumentNumber = '';
  formIssueDate = '';
  formExpiryDate = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly docService: DocumentService,
    private readonly trainingService: TrainingDocumentService,
    private readonly snackbar: MatSnackBar,
    private readonly sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const docId = this.route.snapshot.queryParamMap.get('docId');
    if (docId) {
      this.loadExistingDocument(docId);
    }
  }

  loadExistingDocument(docId: string): void {
    this.isLoading = true;
    this.docService.getById(docId).subscribe({
      next: (doc) => {
        this.isLoading = false;
        this.hasResult = true;
        this.storagePath = doc.storagePath;
        this.ocrText = doc.ocrText || '';
        this.aiCategory = doc.category || '';
        this.aiConfidence = doc.ocrConfidence || 1.0;
        
        this.aiMetadata = {
          holderName: doc.metadata?.holderName,
          organization: doc.metadata?.organization,
          documentName: doc.metadata?.documentName,
          documentNumber: doc.metadata?.documentNumber,
          issueDate: doc.metadata?.issueDate,
          expiryDate: doc.metadata?.expiryDate,
        };

        this.aiVersionInfo = doc.aiVersionInfo || {
          ocr_engine: 'EasyOCR',
          ocr_version: '1.7.2',
          classification_model: 'RuleBased',
          classification_version: '1.0',
        };

        this.formCategory = this.aiCategory || DocumentCategory.OTHER;
        this.formHolder = this.aiMetadata.holderName || '';
        this.formOrganization = this.aiMetadata.organization || '';
        this.formDocumentName = this.aiMetadata.documentName || '';
        this.formDocumentNumber = this.aiMetadata.documentNumber || '';
        this.formIssueDate = this.formatDateForInput(this.aiMetadata.issueDate);
        this.formExpiryDate = this.formatDateForInput(this.aiMetadata.expiryDate);

        this.selectedFile = { name: doc.originalFileName } as any;
        this.fileType = doc.mimeType === 'application/pdf' ? 'pdf' : 'image';
        
        const staticBaseUrl = environment.apiUrl.replace('/api/v1', '');
        const fileUrl = `${staticBaseUrl}/uploads/${doc.storagePath}`;
        this.filePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(fileUrl);
      },
      error: (err) => {
        this.isLoading = false;
        this.snackbar.open('Failed to load existing document for QA review.', 'Close', { duration: 5000 });
      }
    });
  }

  triggerFileSelect(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectFile(file);
    }
  }

  selectFile(file: File): void {
    this.validationError = '';
    this.selectedFile = null;
    this.filePreviewUrl = null;
    this.hasResult = false;

    if (!ALLOWED_TYPES.includes(file.type)) {
      this.validationError = 'Unsupported file type. Please upload PDF, JPG or PNG.';
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      this.validationError = 'File is too large. Maximum size is 10 MB.';
      return;
    }

    this.selectedFile = file;
    this.fileType = file.type === 'application/pdf' ? 'pdf' : 'image';
    
    // Create safe Object URL for iframe/image preview
    const objectUrl = URL.createObjectURL(file);
    this.filePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl);

    this.runAIPipeline();
  }

  runAIPipeline(): void {
    if (!this.selectedFile) return;

    this.isLoading = true;
    this.trainingService.upload(this.selectedFile).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.hasResult = true;
        this.storagePath = res.storagePath;
        
        const ai = res.aiResult;
        this.ocrText = ai.ocr_text || '';
        this.aiCategory = ai.document_type || '';
        this.aiConfidence = ai.classification_confidence || 0;
        this.aiMetadata = ai.metadata || {};
        this.aiVersionInfo = ai.version_info || {};

        // Pre-fill editable form fields with AI extracted metadata
        this.formCategory = this.aiCategory || DocumentCategory.OTHER;
        this.formHolder = this.aiMetadata.holderName || '';
        this.formOrganization = this.aiMetadata.organization || '';
        this.formDocumentName = this.aiMetadata.documentName || '';
        this.formDocumentNumber = this.aiMetadata.documentNumber || '';
        
        // Formats Dates to YYYY-MM-DD for standard HTML date input fields
        this.formIssueDate = this.formatDateForInput(this.aiMetadata.issueDate);
        this.formExpiryDate = this.formatDateForInput(this.aiMetadata.expiryDate);

        this.snackbar.open('Document processed by AI. Ready for review.', 'Close', {
          duration: 3000,
          horizontalPosition: 'right',
        });
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err.error?.message || 'Error processing document with AI pipeline.';
        this.snackbar.open(msg, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
      }
    });
  }

  saveCorrections(): void {
    if (!this.storagePath) return;

    const dto = {
      originalFilePath: this.storagePath,
      ocrText: this.ocrText,
      aiCategory: this.aiCategory,
      aiMetadata: this.aiMetadata,
      correctedMetadata: {
        holderName: this.formHolder || null,
        organization: this.formOrganization || null,
        documentName: this.formDocumentName || null,
        documentNumber: this.formDocumentNumber || null,
        issueDate: this.formIssueDate ? new Date(this.formIssueDate).toISOString() : null,
        expiryDate: this.formExpiryDate ? new Date(this.formExpiryDate).toISOString() : null,
      },
      finalCategory: this.formCategory,
      version: this.aiVersionInfo?.classification_version || '1.0',
    };

    this.isLoading = true;
    this.trainingService.saveCorrections(dto).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.snackbar.open('Review approved! Data stored as training sample.', 'Close', {
          duration: 4000,
        });
        this.reset();
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err.error?.message || 'Failed to save review corrections.';
        this.snackbar.open(msg, 'Close', {
          duration: 5000,
        });
      }
    });
  }

  reset(): void {
    this.selectedFile = null;
    this.filePreviewUrl = null;
    this.fileType = 'unknown';
    this.hasResult = false;
    this.storagePath = '';
    this.ocrText = '';
    this.aiCategory = '';
    this.aiConfidence = 0;
    this.aiMetadata = {};
    this.aiVersionInfo = {};
    this.formCategory = '';
    this.formHolder = '';
    this.formOrganization = '';
    this.formDocumentName = '';
    this.formDocumentNumber = '';
    this.formIssueDate = '';
    this.formExpiryDate = '';
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private formatDateForInput(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().substring(0, 10);
    } catch {
      return '';
    }
  }
}
