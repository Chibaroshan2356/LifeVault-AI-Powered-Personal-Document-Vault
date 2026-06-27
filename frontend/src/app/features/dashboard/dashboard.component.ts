/**
 * dashboard.component.ts — Main Dashboard Component
 *
 * Features:
 *  - Statistics cards (total, processed, expiring, categories)
 *  - Recent documents table
 *  - Expiring documents alert list
 *  - Processing errors list
 *  - Quick actions (Upload, Search)
 *  - Responsive Material Design layout
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';

import { AuthService } from '../auth/services/auth.service';
import { DashboardService } from './services/dashboard.service';

interface StatCard {
  label: string;
  value: number;
  icon: string;
  color: string;
}

interface DocumentItem {
  _id: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  category: string;
  status: string;
  uploadedAt: Date;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatRippleModule,
    MatCardModule,
    MatTableModule,
    MatListModule,
    MatProgressBarModule,
    MatDividerModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  userName = '';
  statCards: StatCard[] = [
    { label: 'Total Documents', value: 0, icon: 'folder', color: 'blue' },
    { label: 'Processed', value: 0, icon: 'check_circle', color: 'green' },
    { label: 'Expiring Soon', value: 0, icon: 'schedule', color: 'orange' },
    { label: 'Categories', value: 0, icon: 'category', color: 'purple' },
  ];

  recentDocuments: DocumentItem[] = [];
  expiringDocuments: DocumentItem[] = [];
  processingErrors: DocumentItem[] = [];

  constructor(
    private readonly authService: AuthService,
    private readonly dashboardService: DashboardService,
    readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    this.loadStats();
    this.loadRecentDocuments();
    this.loadExpiringDocuments();
    this.loadProcessingErrors();
  }

  private loadProfile(): void {
    this.authService.getProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.userName = res.data.fullName.split(' ')[0];
        }
      },
    });
  }

  private loadStats(): void {
    this.dashboardService.getStats().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.statCards[0].value = res.data.totalDocuments;
          this.statCards[1].value = res.data.byStatus.find(
            (s) => s.status === 'READY',
          )?.count ?? 0;
          this.statCards[3].value = res.data.byCategory.length;
        }
      },
    });
  }

  private loadRecentDocuments(): void {
    this.dashboardService.getRecentDocuments(5).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.recentDocuments = res.data.documents;
        }
      },
    });
  }

  private loadExpiringDocuments(): void {
    this.dashboardService.getExpiringDocuments(30).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.expiringDocuments = res.data.documents;
          this.statCards[2].value = this.expiringDocuments.length;
        }
      },
    });
  }

  private loadProcessingErrors(): void {
    this.dashboardService.getProcessingErrors().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.processingErrors = res.data.documents;
        }
      },
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatStatus(status: string): string {
    return status
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  getStatusClass(status: string): string {
    return status;
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: () => this.router.navigate(['/auth/login']),
    });
  }
}
