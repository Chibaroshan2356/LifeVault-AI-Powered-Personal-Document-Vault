import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule }   from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { interval, Subscription } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { ReminderService, AppNotification } from '../documents/services/reminder.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatRippleModule,
  ],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  notifications: AppNotification[] = [];
  unreadCount   = 0;
  isOpen        = false;
  showClearConfirm = false;
  isDeleting    = false;
  private pollSub?: Subscription;
  private focusListener?: () => void;
  private knownNotificationIds = new Set<string>();
  private isInitialLoad = true;

  constructor(
    private readonly reminderService: ReminderService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly elRef: ElementRef,
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen) return;
    const target = event.target as HTMLElement;
    // If click is outside the notification bell and panel, close it
    if (!this.elRef.nativeElement.contains(target)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen) {
      this.close();
    }
  }

  ngOnInit(): void {
    // Request permission on init
    this.reminderService.requestBrowserNotificationPermission();

    // Fast polling every 5 seconds for instant real-time responsiveness
    this.pollSub = interval(5000).pipe(
      startWith(0),
      switchMap(() => this.reminderService.getNotifications()),
    ).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const incoming = res.data.notifications;

          if (!this.isInitialLoad) {
            // Find newly arrived unread notifications
            for (const n of incoming) {
              if (!this.knownNotificationIds.has(n._id) && !n.read) {
                const title = this.getFormattedTitle(n);
                const body  = n.body || `${this.getDocName(n)} — ${this.getSubtitle(n)}`;
                this.reminderService.showBrowserNotification(title, body, n.documentId);
              }
            }
          }

          // Update known set
          for (const n of incoming) {
            this.knownNotificationIds.add(n._id);
          }
          this.isInitialLoad = false;

          this.notifications = incoming;
          this.unreadCount   = res.data.unreadCount;
          this.cdr.detectChanges();
        }
      },
      error: () => {},
    });

    // Also refresh immediately whenever user returns/focuses window
    this.focusListener = () => this.fetchNotifications();
    window.addEventListener('focus', this.focusListener);
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    if (this.focusListener) {
      window.removeEventListener('focus', this.focusListener);
    }
  }

  fetchNotifications(): void {
    this.reminderService.getNotifications().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.notifications = res.data.notifications;
          this.unreadCount   = res.data.unreadCount;
          this.cdr.detectChanges();
        }
      },
      error: () => {},
    });
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    this.showClearConfirm = false;
    // Always fetch latest data when opening the dropdown
    this.fetchNotifications();

    if (this.isOpen && this.unreadCount > 0) {
      this.markAllRead();
    }
    this.cdr.detectChanges();
  }

  close(): void {
    this.isOpen = false;
    this.showClearConfirm = false;
    this.cdr.detectChanges();
  }

  markAllRead(): void {
    this.reminderService.markAllRead().subscribe(() => {
      this.notifications = this.notifications.map(n => ({ ...n, read: true }));
      this.unreadCount   = 0;
      this.cdr.detectChanges();
    });
  }

  onNotificationClick(n: AppNotification): void {
    if (!n.read) {
      this.reminderService.markRead(n._id).subscribe(() => {
        n.read = true;
        this.cdr.detectChanges();
      });
    }
    this.close();
    if (n.documentId) {
      this.router.navigate(['/documents', n.documentId]);
    }
  }

  deleteNotification(event: Event, notif: AppNotification): void {
    event.stopPropagation();
    event.preventDefault();

    // Optimistic removal
    const previous = [...this.notifications];
    this.notifications = this.notifications.filter(item => item._id !== notif._id);
    if (!notif.read && this.unreadCount > 0) {
      this.unreadCount--;
    }
    this.cdr.detectChanges();

    this.reminderService.deleteNotification(notif._id).subscribe({
      error: () => {
        // Rollback on failure
        this.notifications = previous;
        this.cdr.detectChanges();
      },
    });
  }

  promptClearAll(event: Event): void {
    event.stopPropagation();
    this.showClearConfirm = true;
    this.cdr.detectChanges();
  }

  cancelClearAll(event: Event): void {
    event.stopPropagation();
    this.showClearConfirm = false;
    this.cdr.detectChanges();
  }

  confirmClearAll(event: Event): void {
    event.stopPropagation();
    this.isDeleting = true;
    this.cdr.detectChanges();

    this.reminderService.deleteAllNotifications().subscribe({
      next: () => {
        this.notifications = [];
        this.unreadCount = 0;
        this.showClearConfirm = false;
        this.isDeleting = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isDeleting = false;
        this.showClearConfirm = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Helper formatters ──────────────────────────────────────────

  getEmojiIcon(item: AppNotification): string {
    const type = (item.eventType || '').toLowerCase();
    const title = (item.title || '').toLowerCase();

    if (type.includes('insurance') || title.includes('insurance')) return '🛡️';
    if (type.includes('warranty') || title.includes('warranty'))   return '🔧';
    if (type.includes('guarantee') || title.includes('guarantee')) return '✨';
    if (type.includes('bill') || type.includes('payment') || title.includes('bill') || title.includes('payment') || title.includes('fee')) return '💰';
    if (type.includes('certificate') || title.includes('certificate')) return '🎓';
    if (type.includes('passport') || type.includes('visa') || title.includes('passport') || title.includes('visa')) return '🛂';
    if (type.includes('vehicle') || title.includes('vehicle') || title.includes('licence')) return '🚗';
    if (type.includes('processed') || title.includes('processed')) return '📄';
    return '⏰';
  }

  getFormattedTitle(item: AppNotification): string {
    let t = item.title || 'Document Reminder';
    t = t.replace(/^⏰\s*/, '').trim();

    if (t.toLowerCase() === 'certificate') {
      return 'Certificate Expiry Reminder';
    }
    if (t.toLowerCase() === 'insurance') {
      return 'Insurance Renewal Reminder';
    }
    if (t.toLowerCase() === 'warranty') {
      return 'Warranty Expiry Reminder';
    }
    if (!/reminder|renewal|due|expiry|processed/i.test(t)) {
      return `${t} Reminder`;
    }
    return t;
  }

  getDocName(item: AppNotification): string {
    if (item.docName) return item.docName;
    const match = (item.body || '').match(/"([^"]+)"/);
    if (match && match[1]) return match[1];
    return '';
  }

  getSubtitle(item: AppNotification): string {
    if (item.subtitle) return item.subtitle;
    const b = item.body || '';
    if (b.includes(' — ')) {
      return b.split(' — ')[1].trim();
    }
    return b;
  }
}
