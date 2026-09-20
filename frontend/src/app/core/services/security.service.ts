/**
 * security.service.ts — Security & Theft-Protection Frontend API Service
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SecurityEvent {
  id:          string;
  action:      string;
  status:      string;
  ipAddress?:  string;
  userAgent?:  string;
  details?:    string;
  timestamp:   string;
  documentId?: string;
}

export interface SecurityActivityResponse {
  events:     SecurityEvent[];
  total:      number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class SecurityService {
  private readonly url = `${environment.apiUrl}/security`;

  constructor(private readonly http: HttpClient) {}

  getActivity(page = 1, limit = 20): Observable<{ events: SecurityEvent[]; total: number; totalPages: number }> {
    return this.http
      .get<{ success: boolean; data: SecurityEvent[]; pagination: { total: number; totalPages: number } }>(
        `${this.url}/activity?page=${page}&limit=${limit}`,
      )
      .pipe(
        map((res) => ({
          events:     res.data || [],
          total:      res.pagination?.total || 0,
          totalPages: res.pagination?.totalPages || 0,
        })),
      );
  }
}
