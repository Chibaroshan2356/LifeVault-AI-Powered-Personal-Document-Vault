/**
 * DocumentDetailComponent — Shows OCR text, metadata, processing history.
 */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription, interval, startWith, switchMap } from 'rxjs';
import { DocumentService } from '../services/document.service';
import { DocumentDetail, DocumentStatus } from '../models/document.models';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, MatChipsModule, MatProgressSpinnerModule],
  template: `
    <div class="detail-page">
      <div class="header">
        <a routerLink="/documents" class="back"><mat-icon>arrow_back</mat-icon> Documents</a>
        <h1>{{ doc?.originalFileName ?? 'Loading…' }}</h1>
      </div>

      @if (loading) { <div class="center"><mat-spinner diameter="40"/></div> }
      @if (error)   { <div class="err"><mat-icon>error</mat-icon> {{ error }}</div> }

      @if (doc && !loading) {
        <!-- Status + meta row -->
        <div class="meta-row">
          <span class="badge" [attr.data-status]="doc.status">{{ doc.status }}</span>
          <span class="chip">{{ doc.category }}</span>
          <span class="muted">{{ doc.fileSize | number }} bytes</span>
          <span class="muted">{{ doc.mimeType }}</span>
        </div>

        @if (doc.status !== 'READY' && doc.status !== 'FAILED') {
          <div class="card processing-card">
            <mat-spinner diameter="20"></mat-spinner>
            <span>Document is being analyzed by AI. Please wait...</span>
          </div>
        }

        <!-- Metadata card -->
        @if (hasMetadata) {
          <div class="card">
            <h2><mat-icon>info</mat-icon> Extracted Metadata</h2>
            <div class="meta-grid">
              @if (doc.metadata.holderName)     { <div class="field"><span>Holder</span><strong>{{ doc.metadata.holderName }}</strong></div> }
              @if (doc.metadata.documentName)   { <div class="field"><span>Document</span><strong>{{ doc.metadata.documentName }}</strong></div> }
              @if (doc.metadata.organization)   { <div class="field"><span>Organization</span><strong>{{ doc.metadata.organization }}</strong></div> }
              @if (doc.metadata.documentNumber) { <div class="field"><span>Number</span><strong>{{ doc.metadata.documentNumber }}</strong></div> }
              @if (doc.metadata.issueDate)      { <div class="field"><span>Issue Date</span><strong>{{ doc.metadata.issueDate | date:'mediumDate' }}</strong></div> }
              @if (doc.metadata.expiryDate)     { <div class="field"><span>Expiry Date</span><strong>{{ doc.metadata.expiryDate | date:'mediumDate' }}</strong></div> }
            </div>
          </div>
        }

        <!-- OCR Text -->
        @if (doc.ocrText) {
          <div class="card">
            <h2><mat-icon>text_fields</mat-icon> OCR Text
              <span class="conf">confidence: {{ (doc.ocrConfidence * 100).toFixed(1) }}%</span>
            </h2>
            <pre class="ocr-text">{{ doc.ocrText }}</pre>
          </div>
        }

        <!-- Processing History -->
        @if (doc.processingHistory.length) {
          <div class="card">
            <h2><mat-icon>history</mat-icon> Processing History</h2>
            <div class="history">
              @for (entry of doc.processingHistory; track $index) {
                <div class="history-item" [class.failed]="entry.status === 'failed'">
                  <mat-icon>{{ entry.status === 'completed' ? 'check_circle' : entry.status === 'failed' ? 'error' : 'pending' }}</mat-icon>
                  <span class="stage">{{ entry.stage }}</span>
                  <span class="muted">{{ entry.timestamp | date:'HH:mm:ss' }}</span>
                  @if (entry.durationMs) { <span class="muted">{{ entry.durationMs }}ms</span> }
                </div>
              }
            </div>
          </div>
        }

        @if (doc.errorMessage) {
          <div class="card error-card">
            <mat-icon>error_outline</mat-icon> {{ doc.errorMessage }}
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .detail-page { min-height:100vh; background:#f0f2f5; padding:2rem; font-family:Roboto,sans-serif; }
    .header { max-width:800px; margin:0 auto 1rem; }
    .back { display:inline-flex; align-items:center; gap:4px; color:#3f51b5; text-decoration:none; font-size:.875rem; margin-bottom:.5rem; mat-icon{font-size:18px;width:18px;height:18px;} }
    h1 { font-size:1.5rem; font-weight:500; color:#1a237e; margin:0; }
    .center { display:flex; justify-content:center; padding:3rem; }
    .err { max-width:800px; margin:1rem auto; padding:1rem; background:#ffeaea; border-radius:8px; color:#c62828; display:flex; align-items:center; gap:8px; }
    .meta-row { max-width:800px; margin:0 auto 1rem; display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
    .badge { padding:3px 10px; border-radius:999px; font-size:.72rem; font-weight:500; text-transform:uppercase;
      &[data-status="READY"]    { background:#e8f5e9; color:#388e3c; }
      &[data-status="UPLOADED"] { background:#e8eaf6; color:#3f51b5; }
      &[data-status="FAILED"]   { background:#fce4ec; color:#c62828; }
      &[data-status^="OCR"]     { background:#fff3e0; color:#f57c00; }
    }
    .chip { background:#e3f2fd; color:#1565c0; padding:3px 10px; border-radius:999px; font-size:.8rem; }
    .muted { color:#888; font-size:.8rem; }
    .card { max-width:800px; margin:0 auto 1rem; background:white; border-radius:12px; padding:1.25rem 1.5rem; box-shadow:0 1px 4px rgba(0,0,0,.08);
      h2 { display:flex; align-items:center; gap:8px; font-size:1rem; font-weight:500; margin:0 0 1rem; color:#333;
        mat-icon{font-size:20px;width:20px;height:20px;color:#3f51b5;}
        .conf{font-size:.75rem;color:#888;margin-left:auto;font-weight:400;}
      }
    }
    .meta-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; }
    .field { display:flex; flex-direction:column; gap:2px; span{font-size:.75rem;color:#888;} strong{font-size:.9rem;color:#333;} }
    .ocr-text { background:#f8f8f8; border-radius:8px; padding:1rem; font-size:.85rem; white-space:pre-wrap; line-height:1.6; color:#333; max-height:300px; overflow-y:auto; border:1px solid #eee; }
    .history { display:flex; flex-direction:column; gap:8px; }
    .history-item { display:flex; align-items:center; gap:10px; font-size:.875rem; color:#555;
      mat-icon{font-size:18px;width:18px;height:18px;color:#4caf50;}
      &.failed mat-icon{color:#e53935;}
      .stage{font-weight:500;}
    }
    .error-card { background:#fce4ec; display:flex; align-items:center; gap:8px; color:#c62828; mat-icon{color:#c62828;} }
    .processing-card { background:#e8eaf6; display:flex; align-items:center; gap:12px; color:#3f51b5; font-weight:500; }
  `],
})
export class DocumentDetailComponent implements OnInit, OnDestroy {
  doc?: DocumentDetail;
  loading = true;
  error   = '';
  private pollSubscription?: Subscription;

  constructor(private route: ActivatedRoute, private docService: DocumentService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.startPolling(id);
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private startPolling(id: string): void {
    this.pollSubscription = interval(3000)
      .pipe(
        startWith(0),
        switchMap(() => this.docService.getById(id))
      )
      .subscribe({
        next: (d) => {
          this.doc = d;
          this.loading = false;
          if (d.status === DocumentStatus.READY || d.status === DocumentStatus.FAILED) {
            this.stopPolling();
          }
        },
        error: () => {
          if (!this.doc) {
            this.error = 'Failed to load document.';
            this.loading = false;
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

  get hasMetadata(): boolean {
    const m = this.doc?.metadata;
    return !!(m && (m.holderName || m.documentName || m.organization || m.documentNumber || m.issueDate || m.expiryDate));
  }
}
