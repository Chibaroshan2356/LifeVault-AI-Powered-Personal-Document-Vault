import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatRippleModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { SmartFolderService, SmartFolderDetail, SmartFolderDocument } from '../services/smart-folder.service';

@Component({
  selector: 'app-smart-folder-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatRippleModule, MatIconModule, DatePipe, DecimalPipe],
  templateUrl: './smart-folder-detail.component.html',
  styleUrls: ['./smart-folder-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmartFolderDetailComponent implements OnInit {
  folder: SmartFolderDetail | null = null;
  folderName = '';
  isLoading = true;
  error: string | null = null;

  readonly folderColors: Record<string, string> = {
    'Educational':           '#6366f1',
    'Government':            '#a855f7',
    'Fee Receipts':          '#f59e0b',
    'Financial':             '#10b981',
    'Medical':               '#ef4444',
    'Employment / Personal': '#14b8a6',
    'Other':                 '#64748b',
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly smartFolderService: SmartFolderService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.folderName = decodeURIComponent(params.get('name') ?? '');
      this.load();
    });
  }

  load(): void {
    this.isLoading = true;
    this.error = null;
    this.smartFolderService.getDetail(this.folderName).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.folder = res.data;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load folder contents.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  getColor(): string {
    return this.folderColors[this.folderName] ?? '#64748b';
  }

  openDocument(doc: SmartFolderDocument): void {
    this.router.navigate(['/documents', doc._id]);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getMimeIcon(mimeType: string): string {
    if (mimeType?.includes('pdf'))   return 'picture_as_pdf';
    if (mimeType?.includes('image')) return 'image';
    return 'description';
  }

  trackByDoc(_: number, doc: SmartFolderDocument): string {
    return doc._id;
  }
}
