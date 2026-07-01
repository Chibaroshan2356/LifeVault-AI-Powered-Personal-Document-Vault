/**
 * DocumentSearchComponent — Advanced Search Page
 *
 * Features:
 *  - Full-text OCR search
 *  - Metadata search (holder, document name, organization, document number)
 *  - Filters: category, status, file type, file size, date range
 *  - Sorting: newest, oldest, name, size
 *  - Pagination
 *  - Results navigate to detail page on click
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatIconModule }     from '@angular/material/icon';
import { MatButtonModule }   from '@angular/material/button';
import { MatTableModule }    from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }    from '@angular/material/input';
import { MatSelectModule }   from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule }    from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DocumentService, SearchParams } from '../services/document.service';
import type { DocumentListItem } from '../models/document.models';
import { DocumentStatus } from '../models/document.models';

@Component({
  selector: 'app-document-search',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, RouterLink,
    MatIconModule, MatButtonModule, MatTableModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule,
    MatChipsModule, MatPaginatorModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule,
  ],
  templateUrl: './document-search.component.html',
  styleUrl:    './document-search.component.scss',
})
export class DocumentSearchComponent implements OnInit {
  searchForm!: FormGroup;
  results: DocumentListItem[] = [];
  isLoading = false;
  errorMsg = '';
  hasSearched = false;

  // Pagination
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalResults = 0;
  currentPage = 1;

  // Display options
  readonly displayedColumns = ['icon', 'name', 'category', 'size', 'status', 'uploaded', 'actions'];
  readonly documentCategories = [
    'Aadhaar Card', 'PAN Card', 'Passport', 'Driving License',
    'Voter ID', 'Birth Certificate', 'Resume', 'Degree Certificate', 'Marksheet',
    'Educational Certificate', 'Internship Certificate', 'Employment Document',
    'Medical Report', 'Insurance Document', 'Bank Statement', 'Salary Slip',
    'Invoice', 'Warranty Card', 'Fee Receipt', 'Identity Card', 'Other',
  ];
  readonly documentStatuses = [
    'UPLOADED', 'OCR_PENDING', 'OCR_COMPLETED',
    'EXTRACTION_PENDING', 'EXTRACTION_COMPLETED',
    'CLASSIFICATION_PENDING', 'CLASSIFICATION_COMPLETED',
    'READY', 'FAILED',
  ];
  readonly fileTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  readonly sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'name', label: 'File Name (A-Z)' },
    { value: 'size', label: 'File Size (Largest)' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly docService: DocumentService,
    private readonly snackbar: MatSnackBar,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {
    this.searchForm = this.fb.group({
      q:        [''],
      holder:   [''],
      docname:  [''],
      org:      [''],
      docnumber: [''],
      category: [''],
      status:   [''],
      mimeType: [''],
      minSize:  [''],
      maxSize:  [''],
      fromDate: [''],
      toDate:   [''],
      sort:     ['newest'],
    });
  }

  ngOnInit(): void {
    // Check if there are query params from URL
    this.route.queryParams.subscribe((params) => {
      if (Object.keys(params).length > 0) {
        this.populateFormFromParams(params);
        this.executeSearch();
      }
    });
  }

  /**
   * Populate form with query parameters
   */
  private populateFormFromParams(params: any): void {
    const controls = this.searchForm.controls;
    Object.keys(controls).forEach((key) => {
      if (params[key]) {
        controls[key].setValue(params[key]);
      }
    });
  }

  /**
   * Execute search with current form values
   */
  executeSearch(): void {
    if (!this.hasAnySearchCriteria()) {
      this.snackbar.open('Please enter at least one search criterion', 'OK', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    this.errorMsg = '';
    this.currentPage = 1;

    const searchParams: SearchParams = {
      ...this.buildSearchParams(),
      page: this.currentPage,
      limit: this.pageSize,
    };

    this.docService.search(searchParams).subscribe({
      next: ({ documents, pagination }) => {
        this.results = documents;
        this.totalResults = pagination.total;
        this.hasSearched = true;
        this.isLoading = false;
      },
      error: () => {
        this.errorMsg = 'Search failed. Please try again.';
        this.isLoading = false;
      },
    });
  }

  /**
   * Handle pagination change
   */
  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;

    const searchParams: SearchParams = {
      ...this.buildSearchParams(),
      page: this.currentPage,
      limit: this.pageSize,
    };

    this.docService.search(searchParams).subscribe({
      next: ({ documents, pagination }) => {
        this.results = documents;
        this.totalResults = pagination.total;
      },
      error: () => {
        this.snackbar.open('Failed to load page', 'Dismiss', { duration: 3000 });
      },
    });
  }

  /**
   * Clear all filters and results
   */
  clearSearch(): void {
    this.searchForm.reset({ sort: 'newest' });
    this.results = [];
    this.hasSearched = false;
    this.errorMsg = '';
  }

  /**
   * Navigate to document detail
   */
  viewDocument(doc: DocumentListItem): void {
    this.router.navigate(['/documents', doc._id]);
  }

  /**
   * Delete a document from results
   */
  deleteDocument(doc: DocumentListItem): void {
    console.log('deleteDocument triggered for:', doc._id, doc.originalFileName);
    if (!window.confirm(`Delete "${doc.originalFileName}"? This cannot be undone.`)) {
      console.log('Deletion cancelled by user');
      return;
    }

    console.log('Sending delete API request for:', doc._id);
    this.docService.delete(doc._id).subscribe({
      next: () => {
        console.log('Document deleted successfully from DB and storage');
        this.results = this.results.filter((d) => d._id !== doc._id);
        this.totalResults--;
        this.snackbar.open('Document deleted', 'OK', { duration: 3000 });
      },
      error: (err) => {
        console.error('Delete request failed:', err);
        this.snackbar.open('Failed to delete document', 'Dismiss', { duration: 3000 });
      },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────

  private buildSearchParams(): SearchParams {
    const formValue = this.searchForm.value;
    const params: SearchParams = {};

    if (formValue.q?.trim())        params.q = formValue.q;
    if (formValue.holder?.trim())   params.holder = formValue.holder;
    if (formValue.docname?.trim())  params.docname = formValue.docname;
    if (formValue.org?.trim())      params.org = formValue.org;
    if (formValue.docnumber?.trim()) params.docnumber = formValue.docnumber;
    if (formValue.category)         params.category = formValue.category;
    if (formValue.status)           params.status = formValue.status;
    if (formValue.mimeType)         params.mimeType = formValue.mimeType;
    if (formValue.minSize)          params.minSize = parseInt(formValue.minSize, 10);
    if (formValue.maxSize)          params.maxSize = parseInt(formValue.maxSize, 10);
    if (formValue.fromDate)         params.fromDate = this.formatDateToISO(formValue.fromDate);
    if (formValue.toDate)           params.toDate = this.formatDateToISO(formValue.toDate);
    if (formValue.sort)             params.sort = formValue.sort;

    return params;
  }

  private hasAnySearchCriteria(): boolean {
    const { q, holder, docname, org, docnumber, category, status, mimeType, minSize, maxSize, fromDate, toDate } = this.searchForm.value;
    return !!(q?.trim() || holder?.trim() || docname?.trim() || org?.trim() || docnumber?.trim() || category || status || mimeType || minSize || maxSize || fromDate || toDate);
  }

  private formatDateToISO(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString();
  }

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
