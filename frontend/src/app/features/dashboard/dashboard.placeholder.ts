/**
 * DashboardPlaceholderComponent
 *
 * Temporary landing page shown after login until Sprint 8
 * implements the full dashboard with stats, recent documents,
 * and expiry alerts.
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../auth/services/auth.service';

@Component({
  selector: 'app-dashboard-placeholder',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatCardModule],
  template: `
    <div class="dashboard-shell">
      <div class="dashboard-header">
        <div class="logo">
          <mat-icon>lock</mat-icon>
          <span>LifeVault</span>
        </div>
        <button mat-stroked-button (click)="logout()">
          <mat-icon>logout</mat-icon> Sign Out
        </button>
      </div>

      <div class="dashboard-content">
        <mat-card class="welcome-card">
          <mat-card-content>
            <div class="welcome-icon">
              <mat-icon>check_circle</mat-icon>
            </div>
            <h1>Welcome{{ userName ? ', ' + userName : '' }}!</h1>
            <p class="subtitle">You are successfully logged in to LifeVault.</p>
            <p class="status">
              <strong>Sprint 1 (Authentication)</strong> is complete. ✅<br>
              <strong>Sprint 2 (Document Upload)</strong> is next — coming soon.
            </p>
            <div class="sprint-list">
              <div class="sprint-item done">✅ Authentication</div>
              <div class="sprint-item active">🚧 Document Upload</div>
              <div class="sprint-item">⏳ AI / OCR</div>
              <div class="sprint-item">⏳ Search</div>
              <div class="sprint-item">⏳ Dashboard</div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-shell {
      min-height: 100vh;
      background: #f5f5f5;
      font-family: Roboto, sans-serif;
    }

    .dashboard-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2rem;
      height: 64px;
      background: #3f51b5;
      color: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.25rem;
      font-weight: 500;
      color: white;
    }

    .dashboard-header button {
      color: white;
      border-color: rgba(255,255,255,0.6);
    }

    .dashboard-content {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 64px);
      padding: 2rem;
    }

    .welcome-card {
      max-width: 480px;
      width: 100%;
      text-align: center;
      padding: 2rem;
      border-radius: 12px !important;
    }

    .welcome-icon mat-icon {
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
      color: #4caf50;
      margin-bottom: 1rem;
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 500;
      margin: 0 0 0.5rem;
      color: #212121;
    }

    .subtitle {
      color: #666;
      margin: 0 0 1.5rem;
    }

    .status {
      font-size: 0.875rem;
      color: #555;
      line-height: 1.8;
      margin-bottom: 1.5rem;
    }

    .sprint-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      text-align: left;
      background: #f9f9f9;
      border-radius: 8px;
      padding: 1rem 1.25rem;
    }

    .sprint-item {
      font-size: 0.875rem;
      color: #555;
      padding: 0.25rem 0;
    }

    .sprint-item.done  { color: #388e3c; font-weight: 500; }
    .sprint-item.active { color: #f57c00; font-weight: 500; }
  `],
})
export class DashboardPlaceholderComponent implements OnInit {
  userName = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    // Load user profile to display name
    this.authService.getProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.userName = res.data.fullName.split(' ')[0];
        }
      },
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: () => this.router.navigate(['/auth/login']),
    });
  }
}
