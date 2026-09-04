import {
  Component, Input, OnChanges, SimpleChanges,
  ChangeDetectionStrategy, ChangeDetectorRef, OnInit,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule }   from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  ReminderService, Reminder, ReminderDetection, UpsertReminderDto,
} from '../../services/reminder.service';
import { ReminderEditDialogComponent } from './reminder-edit-dialog/reminder-edit-dialog.component';

@Component({
  selector: 'app-smart-reminder',
  standalone: true,
  imports: [CommonModule, DatePipe, MatIconModule, MatButtonModule, MatDialogModule, MatSnackBarModule],
  templateUrl: './smart-reminder.component.html',
  styleUrls: ['./smart-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmartReminderComponent implements OnInit, OnChanges {
  @Input() documentId!: string;
  @Input() docCategory = '';
  @Input() ocrConfidence = 1;

  reminder: Reminder | null = null;
  detection: ReminderDetection = { hasActionableDate: false };
  isLoading = true;
  isSaving  = false;

  constructor(
    private readonly reminderService: ReminderService,
    private readonly dialog:   MatDialog,
    private readonly snackbar: MatSnackBar,
    private readonly cdr:      ChangeDetectorRef,
  ) {}

  ngOnInit(): void { this.load(); }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['documentId'] && !changes['documentId'].firstChange) {
      this.load();
    }
  }

  load(): void {
    if (!this.documentId) return;
    this.isLoading = true;
    this.reminderService.getReminderForDocument(this.documentId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.reminder  = res.data.reminder;
          this.detection = res.data.detection;
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Computed helpers ───────────────────────────────────────────

  get hasReminder(): boolean {
    return !!(this.reminder && this.reminder.eventDate);
  }

  get isExpired(): boolean {
    if (!this.reminder?.eventDate) return false;
    return new Date(this.reminder.eventDate) < new Date();
  }

  get daysRemaining(): number {
    if (!this.reminder?.eventDate) return 0;
    const diff = new Date(this.reminder.eventDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  get enabledIntervalLabels(): string {
    if (!this.reminder) return '';
    return this.reminder.intervals
      .filter(i => i.enabled)
      .map(i => i.daysBefore === 0 ? 'On day' : `${i.daysBefore}d before`)
      .join(', ');
  }

  // ── Actions ────────────────────────────────────────────────────

  openEditDialog(isManual = false): void {
    const data = {
      documentId: this.documentId,
      reminder:   this.reminder,
      detection:  this.detection,
      isManual,
    };

    const ref = this.dialog.open(ReminderEditDialogComponent, {
      width:      '500px',
      maxWidth:   '95vw',
      maxHeight:  '90vh',
      autoFocus:  false,
      data,
      panelClass: 'reminder-dialog-panel',
    });

    ref.afterClosed().subscribe((dto: UpsertReminderDto | null) => {
      if (!dto) return;
      this.isSaving = true;
      this.cdr.detectChanges();

      this.reminderService.saveReminder(this.documentId, dto).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.reminder = res.data;
            this.detection.hasActionableDate = true;
          }
          this.isSaving = false;
          this.snackbar.open('✅ Reminder saved', 'OK', { duration: 3000, panelClass: ['snackbar-success'] });
          this.cdr.detectChanges();
        },
        error: () => {
          this.isSaving = false;
          this.snackbar.open('Failed to save reminder', 'Dismiss', { duration: 4000, panelClass: ['snackbar-error'] });
          this.cdr.detectChanges();
        },
      });
    });
  }

  enableReminder(): void {
    if (!this.reminder) return;
    this.reminderService.saveReminder(this.documentId, { enabled: true }).subscribe({
      next: (res) => {
        if (res.success && res.data) { this.reminder = res.data; }
        this.cdr.detectChanges();
      },
    });
  }

  disableReminder(): void {
    this.reminderService.disableReminder(this.documentId).subscribe({
      next: (res) => {
        if (res.success && res.data) { this.reminder = res.data; }
        this.cdr.detectChanges();
      },
    });
  }
}
