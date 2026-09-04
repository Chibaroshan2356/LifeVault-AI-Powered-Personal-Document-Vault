import { Component, Inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule }   from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  Reminder, ReminderDetection, UpsertReminderDto, ReminderInterval,
} from '../../../services/reminder.service';

export interface ReminderDialogData {
  documentId: string;
  reminder:   Reminder | null;
  detection:  ReminderDetection;
  isManual:   boolean;
}

interface IntervalOption {
  daysBefore: number;
  label:      string;
  enabled:    boolean;
}

@Component({
  selector: 'app-reminder-edit-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './reminder-edit-dialog.component.html',
  styleUrls: ['./reminder-edit-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReminderEditDialogComponent implements OnInit {
  eventLabel       = '';
  eventDateStr     = '';    // yyyy-MM-dd for input[type=date]
  notificationTime = '09:00';
  enabled          = true;

  intervalOptions: IntervalOption[] = [
    { daysBefore: 30, label: '30 days before', enabled: true  },
    { daysBefore: 15, label: '15 days before', enabled: true  },
    { daysBefore: 7,  label: '7 days before',  enabled: true  },
    { daysBefore: 1,  label: '1 day before',   enabled: true  },
    { daysBefore: 0,  label: 'On the event date', enabled: false },
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ReminderDialogData,
    private readonly dialogRef: MatDialogRef<ReminderEditDialogComponent>,
  ) {}

  ngOnInit(): void {
    const r = this.data.reminder;
    if (r) {
      this.eventLabel       = r.eventLabel;
      this.eventDateStr     = r.eventDate ? new Date(r.eventDate).toISOString().split('T')[0] : '';
      this.notificationTime = r.notificationTime ?? '09:00';
      this.enabled          = r.enabled ?? true;

      // Merge saved intervals into options
      for (const opt of this.intervalOptions) {
        const saved = r.intervals?.find(i => i.daysBefore === opt.daysBefore);
        if (saved) opt.enabled = saved.enabled;
      }
    } else if (this.data.detection.hasActionableDate && this.data.detection.eventDate) {
      this.eventLabel   = this.data.detection.eventLabel ?? 'Document Expiry';
      this.eventDateStr = new Date(this.data.detection.eventDate).toISOString().split('T')[0];
    }
  }

  get isValid(): boolean {
    return !!(this.eventLabel.trim() && this.eventDateStr);
  }

  save(): void {
    if (!this.isValid) return;

    const intervals: ReminderInterval[] = this.intervalOptions.map(opt => ({
      daysBefore: opt.daysBefore,
      enabled:    opt.enabled,
    }));

    const dto: UpsertReminderDto = {
      eventLabel:       this.eventLabel.trim(),
      eventDate:        this.eventDateStr,
      intervals,
      notificationTime: this.notificationTime,
      channels:         { inApp: true, browser: true, email: true },
      enabled:          this.enabled,
      isManual:         this.data.isManual,
    };

    this.dialogRef.close(dto);
  }

  disableAndClose(): void {
    const dto: UpsertReminderDto = { enabled: false };
    this.dialogRef.close(dto);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
