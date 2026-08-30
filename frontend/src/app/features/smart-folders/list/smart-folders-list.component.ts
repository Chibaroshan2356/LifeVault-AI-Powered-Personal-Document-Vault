import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatRippleModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { SmartFolderService, SmartFolder, SmartFolderDocument } from '../services/smart-folder.service';

@Component({
  selector: 'app-smart-folders-list',
  standalone: true,
  imports: [CommonModule, MatRippleModule, MatIconModule, DatePipe],
  templateUrl: './smart-folders-list.component.html',
  styleUrls: ['./smart-folders-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmartFoldersListComponent implements OnInit {
  folders: SmartFolder[] = [];
  isFoldersLoading = true;

  selectedFolder: SmartFolder | null = null;
  folderDocuments: SmartFolderDocument[] = [];
  isDocsLoading = false;
  docsError: string | null = null;

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
    private readonly smartFolderService: SmartFolderService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadFolders();
  }

  loadFolders(): void {
    this.isFoldersLoading = true;
    this.smartFolderService.list().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.folders = res.data;
          // Auto-select first folder that has documents, or just the first
          const first = this.folders.find(f => f.count > 0) ?? this.folders[0];
          if (first) this.selectFolder(first);
        }
        this.isFoldersLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isFoldersLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  selectFolder(folder: SmartFolder): void {
    this.selectedFolder = folder;
    this.folderDocuments = [];
    this.isDocsLoading = true;
    this.docsError = null;
    this.cdr.detectChanges();

    this.smartFolderService.getDetail(folder.id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.folderDocuments = res.data.documents;
        }
        this.isDocsLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.docsError = err?.error?.message || 'Failed to load documents.';
        this.isDocsLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  openDocument(doc: SmartFolderDocument): void {
    this.router.navigate(['/documents', doc._id]);
  }

  getColor(folderName: string): string {
    return this.folderColors[folderName] ?? '#64748b';
  }

  getMimeIcon(mimeType: string): string {
    if (mimeType?.includes('pdf'))   return 'picture_as_pdf';
    if (mimeType?.includes('image')) return 'image';
    return 'description';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  trackByFolder(_: number, f: SmartFolder): string { return f.id; }
  trackByDoc(_: number, d: SmartFolderDocument): string { return d._id; }
}
