/**
 * DocumentListComponent — Documents List Page
 *
 * Shows all uploaded documents for the authenticated user.
 * Features: status badges, file type icons, delete, upload button.
 */
import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule }    from '@angular/material/icon';
import { MatButtonModule }  from '@angular/material/button';
import { MatTableModule }   from '@angular/material/table';
import { MatChipsModule }   from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Subscription, interval, startWith, switchMap } from 'rxjs';

import { DocumentService }  from '../services/document.service';
import { DocumentListItem, DocumentStatus } from '../models/document.models';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatIconModule, MatButtonModule, MatTableModule,
    MatChipsModule, MatTooltipModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDialogModule,
  ],
  templateUrl: './document-list.component.html',
  styleUrl:    './document-list.component.scss',
})
export class DocumentListComponent implements OnInit, OnDestroy {
  @ViewChild('deleteConfirmDialog') deleteConfirmDialog!: TemplateRef<any>;
  documents: DocumentListItem[] = [];
  isLoading = true;
  errorMsg  = '';
  documentToDelete?: DocumentListItem;
  private pollSubscription?: Subscription;

  readonly displayedColumns = ['icon', 'name', 'category', 'size', 'status', 'uploaded', 'actions'];

  constructor(
    private readonly docService: DocumentService,
    private readonly snackbar:   MatSnackBar,
    private readonly router:     Router,
    private readonly dialog:     MatDialog,
  ) {}

  ngOnInit(): void { this.loadDocuments(); }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  loadDocuments(): void {
    this.isLoading = true;
    this.errorMsg  = '';
    this.stopPolling();

    this.pollSubscription = interval(3000)
      .pipe(
        startWith(0),
        switchMap(() => this.docService.list())
      )
      .subscribe({
        next: ({ documents }) => {
          this.documents = documents;
          this.isLoading = false;
          // Stop polling if there are no processing documents
          const hasProcessing = documents.some(
            (d) => d.status !== DocumentStatus.READY && d.status !== DocumentStatus.FAILED
          );
          if (!hasProcessing) {
            this.stopPolling();
          }
        },
        error: () => {
          if (this.documents.length === 0) {
            this.errorMsg  = 'Failed to load documents.';
            this.isLoading = false;
            this.stopPolling();
          }
        },
      });
  }

  private stopPolling(): void {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
      this.pollSubscription = undefined;
    }
  }

  deleteDocument(doc: DocumentListItem): void {
    console.log('deleteDocument triggered for:', doc._id, doc.originalFileName);
    this.documentToDelete = doc;
    const dialogRef = this.dialog.open(this.deleteConfirmDialog, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        console.log('Sending delete API request for:', doc._id);
        this.docService.delete(doc._id).subscribe({
          next: () => {
            console.log('Document deleted successfully from DB and storage');
            this.documents = this.documents.filter((d) => d._id !== doc._id);
            this.snackbar.open('Document deleted', 'OK', {
              duration: 3000,
              panelClass: ['snackbar-success'],
            });
          },
          error: (err) => {
            console.error('Delete request failed:', err);
            this.snackbar.open('Failed to delete document', 'Dismiss', {
              duration: 4000,
              panelClass: ['snackbar-error'],
            });
          },
        });
      } else {
        console.log('Deletion cancelled by user');
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────

  getFileIcon(mimeType: string): string {
    if (mimeType === 'application/pdf') return 'picture_as_pdf';
    if (mimeType.startsWith('image/'))  return 'image';
    return 'insert_drive_file';
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      [DocumentStatus.UPLOADED]:               'default',
      [DocumentStatus.OCR_PENDING]:            'accent',
      [DocumentStatus.OCR_COMPLETED]:          'accent',
      [DocumentStatus.EXTRACTION_PENDING]:     'accent',
      [DocumentStatus.EXTRACTION_COMPLETED]:   'accent',
      [DocumentStatus.CLASSIFICATION_PENDING]: 'accent',
      [DocumentStatus.READY]:                  'primary',
      [DocumentStatus.FAILED]:                 'warn',
    };
    return map[status] ?? 'default';
  }

  getStatusLabel(status: string): string {
    return status.replace(/_/g, ' ');
  }

  formatSize(bytes: number): string {
    const kb = bytes / 1024;
    return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
}
