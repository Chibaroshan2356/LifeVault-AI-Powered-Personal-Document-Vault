import {
  Component,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { NotificationBellComponent } from '../notifications/notification-bell.component';

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
    MatTooltipModule,
    MatRippleModule,
    NotificationBellComponent,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent implements OnInit, AfterViewInit, OnDestroy {
  userName  = '';
  userEmail = '';
  private authSub?: Subscription;

  private sidebarMouseMoveListener = (event: MouseEvent): void => {
    const sidebar = event.currentTarget as HTMLElement;
    const rect = sidebar.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    sidebar.style.setProperty('--mouse-x', `${x}px`);
    sidebar.style.setProperty('--mouse-y', `${y}px`);
  };

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly elRef: ElementRef,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Reactively update user name & email whenever auth state changes (login, logout, switch account)
    this.authSub = this.authService.authState$.subscribe((state) => {
      if (state.user) {
        this.userName  = state.user.fullName;
        this.userEmail = state.user.email;
        this.cdr.detectChanges();
      } else if (state.isAuthenticated) {
        this.loadProfile();
      } else {
        this.userName  = '';
        this.userEmail = '';
        this.cdr.detectChanges();
      }
    });

    // Always dark theme
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
  }

  ngAfterViewInit(): void {
    // Register the mouse movement listener outside Angular Zone to bypass change detection checks
    this.ngZone.runOutsideAngular(() => {
      const sidebarEl = this.elRef.nativeElement.querySelector('.sidebar');
      if (sidebarEl) {
        sidebarEl.addEventListener('mousemove', this.sidebarMouseMoveListener);
      }
    });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    const sidebarEl = this.elRef.nativeElement.querySelector('.sidebar');
    if (sidebarEl) {
      sidebarEl.removeEventListener('mousemove', this.sidebarMouseMoveListener);
    }
  }

  private loadProfile(): void {
    this.authService.getProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.userName  = res.data.fullName;
          this.userEmail = res.data.email;
          this.cdr.detectChanges();
        }
      },
      error: () => {
        const user = this.authService.currentUser;
        if (user) {
          this.userName  = user.fullName;
          this.userEmail = user.email;
          this.cdr.detectChanges();
        }
      },
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.router.navigate(['/auth/login']);
      },
    });
  }

  isDocumentsActive(): boolean {
    const url = this.router.url;
    return url.startsWith('/documents') &&
           !url.startsWith('/documents/search') &&
           !url.startsWith('/documents/training');
  }
}
