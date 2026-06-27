/**
 * DashboardPlaceholderComponent
 * App shell shown after login. Replaced by real DashboardComponent in Sprint 8.
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { AuthService } from '../auth/services/auth.service';

@Component({
  selector: 'app-dashboard-placeholder',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, MatRippleModule],
  template: `
    <div class="shell">

      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="brand">
          <mat-icon>lock</mat-icon>
          <span>LifeVault</span>
        </div>

        <nav class="nav">
          <a class="nav-item active" matRipple>
            <mat-icon>dashboard</mat-icon><span>Dashboard</span>
          </a>
          <a class="nav-item" matRipple>
            <mat-icon>folder</mat-icon><span>Documents</span>
          </a>
          <a class="nav-item" matRipple>
            <mat-icon>search</mat-icon><span>Search</span>
          </a>
          <a class="nav-item" matRipple>
            <mat-icon>notifications</mat-icon><span>Notifications</span>
          </a>
          <a class="nav-item" matRipple>
            <mat-icon>person</mat-icon><span>Profile</span>
          </a>
        </nav>

        <button class="signout" (click)="logout()">
          <mat-icon>logout</mat-icon><span>Sign Out</span>
        </button>
      </aside>

      <!-- Main -->
      <div class="main">

        <!-- Top bar -->
        <header class="topbar">
          <div>
            <h1 class="greeting">Good day{{ userName ? ', ' + userName : '' }} 👋</h1>
            <p class="sub">Here's your document overview</p>
          </div>
          <button class="upload-btn" matRipple (click)="router.navigate(['/documents/upload'])">
            <mat-icon>upload_file</mat-icon> Upload Document
          </button>
        </header>

        <!-- Stats row -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-icon blue"><mat-icon>folder</mat-icon></div>
            <div class="stat-info">
              <span class="stat-value">0</span>
              <span class="stat-label">Total Documents</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green"><mat-icon>check_circle</mat-icon></div>
            <div class="stat-info">
              <span class="stat-value">0</span>
              <span class="stat-label">Processed</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon orange"><mat-icon>schedule</mat-icon></div>
            <div class="stat-info">
              <span class="stat-value">0</span>
              <span class="stat-label">Expiring Soon</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon purple"><mat-icon>category</mat-icon></div>
            <div class="stat-info">
              <span class="stat-value">0</span>
              <span class="stat-label">Categories</span>
            </div>
          </div>
        </div>

        <!-- Content area -->
        <div class="content-row">

          <!-- Recent documents -->
          <div class="panel recent">
            <div class="panel-header">
              <h2>Recent Documents</h2>
              <a class="see-all">See all</a>
            </div>
            <div class="empty-state">
              <mat-icon>cloud_upload</mat-icon>
              <p>No documents yet.</p>
              <span>Upload your first document to get started.</span>
              <button class="upload-btn-sm" matRipple>
                <mat-icon>add</mat-icon> Upload Now
              </button>
            </div>
          </div>

          <!-- Right column -->
          <div class="right-col">

            <!-- Expiry alerts -->
            <div class="panel alerts">
              <div class="panel-header">
                <h2>Expiry Alerts</h2>
              </div>
              <div class="empty-state small">
                <mat-icon>notifications_none</mat-icon>
                <p>No upcoming expiries</p>
              </div>
            </div>

            <!-- Build progress -->
            <div class="panel progress-panel">
              <div class="panel-header"><h2>Build Progress</h2></div>
              <div class="progress-list">
                <div class="prog-item done">
                  <mat-icon>check_circle</mat-icon>
                  <span>Authentication</span>
                  <span class="badge done">Done</span>
                </div>
                <div class="prog-item active">
                  <mat-icon>pending</mat-icon>
                  <span>Document Upload</span>
                  <span class="badge active">Sprint 2</span>
                </div>
                <div class="prog-item">
                  <mat-icon>radio_button_unchecked</mat-icon>
                  <span>OCR / AI</span>
                  <span class="badge pending">Sprint 5</span>
                </div>
                <div class="prog-item">
                  <mat-icon>radio_button_unchecked</mat-icon>
                  <span>Search</span>
                  <span class="badge pending">Sprint 9</span>
                </div>
                <div class="prog-item">
                  <mat-icon>radio_button_unchecked</mat-icon>
                  <span>Full Dashboard</span>
                  <span class="badge pending">Sprint 8</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .shell {
      display: flex;
      height: 100vh;
      font-family: Roboto, sans-serif;
      background: #f0f2f5;
    }

    /* ── Sidebar ── */
    .sidebar {
      width: 240px;
      min-width: 240px;
      background: #1a237e;
      color: white;
      display: flex;
      flex-direction: column;
      padding: 0;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 20px;
      font-size: 1.2rem;
      font-weight: 600;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      mat-icon { color: #90caf9; }
    }

    .nav {
      flex: 1;
      padding: 12px 0;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      color: rgba(255,255,255,0.7);
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.9rem;
      border-radius: 0;

      &:hover { background: rgba(255,255,255,0.1); color: white; }
      &.active { background: rgba(255,255,255,0.15); color: white;
        border-left: 3px solid #90caf9; }

      mat-icon { font-size: 20px; width: 20px; height: 20px; }
    }

    .signout {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: none;
      border: none;
      border-top: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.6);
      cursor: pointer;
      font-size: 0.9rem;
      width: 100%;
      transition: color 0.2s;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      &:hover { color: white; }
    }

    /* ── Main ── */
    .main {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .greeting {
      font-size: 1.5rem;
      font-weight: 500;
      color: #1a237e;
    }

    .sub { color: #666; font-size: 0.875rem; margin-top: 4px; }

    .upload-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: #3f51b5;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      transition: background 0.2s;
      mat-icon { font-size: 20px; }
      &:hover { background: #303f9f; }
    }

    /* ── Stats ── */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }

    .stat-icon {
      width: 48px; height: 48px;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 24px; width: 24px; height: 24px; color: white; }

      &.blue   { background: #e3f2fd; mat-icon { color: #1976d2; } }
      &.green  { background: #e8f5e9; mat-icon { color: #388e3c; } }
      &.orange { background: #fff3e0; mat-icon { color: #f57c00; } }
      &.purple { background: #f3e5f5; mat-icon { color: #7b1fa2; } }
    }

    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 1.5rem; font-weight: 600; color: #212121; }
    .stat-label { font-size: 0.75rem; color: #666; margin-top: 2px; }

    /* ── Content Row ── */
    .content-row {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 20px;
      flex: 1;
    }

    .panel {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;

      h2 { font-size: 1rem; font-weight: 500; color: #212121; }
      .see-all { font-size: 0.8rem; color: #3f51b5; cursor: pointer; }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      gap: 8px;
      color: #999;

      mat-icon { font-size: 48px; width: 48px; height: 48px; color: #ccc; }
      p { font-size: 0.95rem; color: #555; font-weight: 500; }
      span { font-size: 0.8rem; text-align: center; }

      &.small { padding: 20px; mat-icon { font-size: 32px; width: 32px; height: 32px; } }
    }

    .upload-btn-sm {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px;
      background: #3f51b5; color: white;
      border: none; border-radius: 6px;
      cursor: pointer; font-size: 0.85rem; margin-top: 8px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { background: #303f9f; }
    }

    /* ── Right Column ── */
    .right-col { display: flex; flex-direction: column; gap: 16px; }

    /* ── Progress ── */
    .progress-list { display: flex; flex-direction: column; gap: 10px; }

    .prog-item {
      display: flex; align-items: center; gap: 10px;
      font-size: 0.85rem; color: #555;

      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #ccc; }

      &.done { color: #388e3c; mat-icon { color: #388e3c; } }
      &.active { color: #f57c00; mat-icon { color: #f57c00; } }

      span:nth-child(2) { flex: 1; }
    }

    .badge {
      font-size: 0.7rem; padding: 2px 8px;
      border-radius: 999px; font-weight: 500;

      &.done    { background: #e8f5e9; color: #388e3c; }
      &.active  { background: #fff3e0; color: #f57c00; }
      &.pending { background: #f5f5f5; color: #999; }
    }
  `],
})
export class DashboardPlaceholderComponent implements OnInit {
  userName = '';

  constructor(
    private readonly authService: AuthService,
    readonly router: Router,
  ) {}

  ngOnInit(): void {
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
      next:  () => this.router.navigate(['/auth/login']),
      error: () => this.router.navigate(['/auth/login']),
    });
  }
}
