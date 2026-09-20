/**
 * security-activity.component.ts — Security & Theft Protection Activity Log Component
 */
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRippleModule } from '@angular/material/core';
import { SecurityService, SecurityEvent } from '../../core/services/security.service';

@Component({
  selector: 'app-security-activity',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressBarModule,
    MatRippleModule,
  ],
  templateUrl: './security-activity.component.html',
  styleUrls: ['./security-activity.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityActivityComponent implements OnInit {
  events: SecurityEvent[] = [];
  filteredEvents: SecurityEvent[] = [];
  loading = true;
  error = '';
  activeFilter = 'ALL';

  total = 0;
  totalPages = 0;
  currentPage = 1;

  constructor(
    private readonly securityService: SecurityService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadActivity();
  }

  loadActivity(page = 1): void {
    this.loading = true;
    this.error = '';
    this.currentPage = page;

    this.securityService.getActivity(page, 30).subscribe({
      next: (res) => {
        this.events = res.events;
        this.total = res.total;
        this.totalPages = res.totalPages;
        this.applyFilter(this.activeFilter);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = 'Failed to load security activity log. Please try again.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  applyFilter(filter: string): void {
    this.activeFilter = filter;
    if (filter === 'ALL') {
      this.filteredEvents = [...this.events];
    } else if (filter === 'LOGINS') {
      this.filteredEvents = this.events.filter(
        (e) => e.action === 'LOGIN_SUCCESS' || e.action === 'LOGIN_FAILED' || e.action === 'LOGOUT',
      );
    } else if (filter === 'DOWNLOADS') {
      this.filteredEvents = this.events.filter((e) => e.action === 'DOCUMENT_DOWNLOAD');
    } else if (filter === 'VIEWS') {
      this.filteredEvents = this.events.filter((e) => e.action === 'DOCUMENT_VIEW');
    } else if (filter === 'ALERTS') {
      this.filteredEvents = this.events.filter(
        (e) => e.action === 'SUSPICIOUS_ACTIVITY' || e.status === 'FAILED',
      );
    }
    this.cdr.markForCheck();
  }

  getActionIcon(action: string): string {
    switch (action) {
      case 'LOGIN_SUCCESS':       return 'login';
      case 'LOGIN_FAILED':        return 'gpp_bad';
      case 'LOGOUT':              return 'logout';
      case 'DOCUMENT_DOWNLOAD':   return 'download';
      case 'DOCUMENT_VIEW':       return 'visibility';
      case 'DOCUMENT_DELETE':     return 'delete_outline';
      case 'DOCUMENT_UPDATE':     return 'edit_note';
      case 'SUSPICIOUS_ACTIVITY': return 'warning_amber';
      default:                    return 'shield';
    }
  }

  getActionBadgeClass(action: string, status: string): string {
    if (action === 'SUSPICIOUS_ACTIVITY' || status === 'FAILED' || action === 'LOGIN_FAILED') {
      return 'badge-danger';
    }
    if (action === 'DOCUMENT_DOWNLOAD') {
      return 'badge-download';
    }
    if (action === 'DOCUMENT_VIEW') {
      return 'badge-view';
    }
    if (action === 'LOGIN_SUCCESS') {
      return 'badge-success';
    }
    return 'badge-neutral';
  }

  formatActionTitle(action: string): string {
    switch (action) {
      case 'LOGIN_SUCCESS':       return 'Successful Login';
      case 'LOGIN_FAILED':        return 'Failed Login Attempt';
      case 'LOGOUT':              return 'User Logged Out';
      case 'DOCUMENT_DOWNLOAD':   return 'Document Downloaded';
      case 'DOCUMENT_VIEW':       return 'Document Viewed';
      case 'DOCUMENT_DELETE':     return 'Document Deleted';
      case 'DOCUMENT_UPDATE':     return 'Document Updated';
      case 'SUSPICIOUS_ACTIVITY': return 'Suspicious Activity Detected';
      default:                    return action;
    }
  }
}
