import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ReminderInterval {
  daysBefore: number;
  enabled:    boolean;
  sentAt?:    string;
}

export interface ReminderChannels {
  inApp:   boolean;
  browser: boolean;
  email:   boolean;
}

export interface Reminder {
  _id:              string;
  documentId:       string;
  eventType:        string;
  eventLabel:       string;
  eventDate:        string;
  intervals:        ReminderInterval[];
  notificationTime: string;
  channels:         ReminderChannels;
  timezone?:        string;
  enabled:          boolean;
  isManual:         boolean;
  lowConfidence:    boolean;
  createdAt:        string;
  updatedAt:        string;
}

export interface ReminderDetection {
  hasActionableDate: boolean;
  eventDate?:        string;
  eventType?:        string;
  eventLabel?:       string;
  lowConfidence?:    boolean;
}

export interface ReminderResponse {
  reminder:  Reminder | null;
  detection: ReminderDetection;
}

export interface UpsertReminderDto {
  eventType?:        string;
  eventLabel?:       string;
  eventDate?:        string;
  intervals?:        ReminderInterval[];
  notificationTime?: string;
  timezone?:         string;
  channels?:         ReminderChannels;
  enabled?:          boolean;
  isManual?:         boolean;
}

export interface AppNotification {
  _id:        string;
  documentId: string;
  title:      string;
  body:       string;
  eventType?: string;
  docName?:   string;
  subtitle?:  string;
  read:       boolean;
  createdAt:  string;
}

export interface TestTriggerResponse {
  success:  boolean;
  channels: {
    inApp:   'sent' | 'failed' | 'disabled';
    browser: 'sent' | 'failed' | 'disabled';
    email:   'sent' | 'failed' | 'disabled';
  };
  errors?: Record<string, string>;
  debug?:  Record<string, any>;
}

interface ApiResponse<T> {
  success: boolean;
  data?:   T;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ReminderService {
  private readonly remindersUrl      = `${environment.apiUrl}/reminders`;
  private readonly notificationsUrl  = `${environment.apiUrl}/notifications`;

  constructor(private readonly http: HttpClient) {}

  /** Fetch reminder + detection result for a document */
  getReminderForDocument(documentId: string): Observable<ApiResponse<ReminderResponse>> {
    return this.http.get<ApiResponse<ReminderResponse>>(`${this.remindersUrl}/${documentId}`);
  }

  /** Create or update reminder */
  saveReminder(documentId: string, dto: UpsertReminderDto): Observable<ApiResponse<Reminder>> {
    return this.http.put<ApiResponse<Reminder>>(`${this.remindersUrl}/${documentId}`, dto);
  }

  /** Disable reminder */
  disableReminder(documentId: string): Observable<ApiResponse<Reminder>> {
    return this.http.delete<ApiResponse<Reminder>>(`${this.remindersUrl}/${documentId}`);
  }

  /** Immediate test trigger */
  testReminder(documentId?: string): Observable<TestTriggerResponse> {
    const url = documentId ? `${this.remindersUrl}/${documentId}/test` : `${this.remindersUrl}/test`;
    return this.http.post<TestTriggerResponse>(url, { documentId });
  }

  /** Get debug info */
  getReminderDebug(documentId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.remindersUrl}/${documentId}/debug`);
  }

  /** List in-app notifications */
  getNotifications(): Observable<ApiResponse<{ notifications: AppNotification[]; unreadCount: number }>> {
    return this.http.get<ApiResponse<{ notifications: AppNotification[]; unreadCount: number }>>(this.notificationsUrl);
  }

  /** Mark one notification as read */
  markRead(notificationId: string): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.notificationsUrl}/${notificationId}/read`, {});
  }

  /** Mark all notifications as read */
  markAllRead(): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.notificationsUrl}/read-all`, {});
  }

  /** Delete a single notification */
  deleteNotification(notificationId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.notificationsUrl}/${notificationId}`);
  }

  /** Delete all notifications */
  deleteAllNotifications(): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.notificationsUrl}/clear-all`);
  }

  /** Request browser notification permission */
  async requestBrowserNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    return Notification.requestPermission();
  }

  /** Show a browser notification */
  showBrowserNotification(title: string, body: string, documentId: string): void {
    if (Notification.permission !== 'granted') return;
    const notif = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag:  `lifevault-${documentId}`,
    });
    notif.onclick = () => {
      window.focus();
      window.location.href = `/documents/${documentId}`;
    };
  }
}
