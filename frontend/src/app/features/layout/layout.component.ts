import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';

import { AuthService } from '../auth/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatRippleModule,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent implements OnInit {
  userName = '';
  userEmail = '';
  isDarkTheme = true; // default dark first

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    this.applyTheme();
  }

  private loadProfile(): void {
    // Attempt profile load
    this.authService.getProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.userName = res.data.fullName;
          this.userEmail = res.data.email;
        }
      },
      error: () => {
        // Safe fallback if user state is empty
        const user = this.authService.currentUser;
        if (user) {
          this.userName = user.fullName;
          this.userEmail = user.email;
        }
      }
    });
  }

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    this.applyTheme();
  }

  private applyTheme(): void {
    const body = document.body;
    if (this.isDarkTheme) {
      body.classList.add('dark-theme');
      body.classList.remove('light-theme');
    } else {
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
    }
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.router.navigate(['/auth/login']);
      }
    });
  }

  onSidebarMouseMove(event: MouseEvent): void {
    const sidebar = event.currentTarget as HTMLElement;
    const rect = sidebar.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    sidebar.style.setProperty('--mouse-x', `${x}px`);
    sidebar.style.setProperty('--mouse-y', `${y}px`);
  }
}
