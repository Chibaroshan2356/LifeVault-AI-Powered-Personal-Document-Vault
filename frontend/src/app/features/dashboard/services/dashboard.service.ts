/**
 * dashboard.service.ts — Dashboard API Service
 *
 * Communicates with the backend /api/v1/dashboard/* endpoints
 * to fetch statistics, recent documents, expiring documents, and errors.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DashboardStats {
  totalDocuments: number;
  byCategory: Array<{ category: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
}

export interface DashboardDocument {
  _id: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  category: string;
  status: string;
  uploadedAt: Date;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly apiUrl = `${environment.apiUrl}/dashboard`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Fetch dashboard statistics
   */
  getStats(): Observable<ApiResponse<DashboardStats>> {
    return this.http.get<ApiResponse<DashboardStats>>(`${this.apiUrl}/stats`);
  }

  /**
   * Fetch recent documents
   * @param limit — maximum number of documents (default 10)
   */
  getRecentDocuments(limit: number = 10): Observable<
    ApiResponse<{ documents: DashboardDocument[] }>
  > {
    let params = new HttpParams();
    if (limit) {
      params = params.set('limit', limit.toString());
    }
    return this.http.get<ApiResponse<{ documents: DashboardDocument[] }>>(
      `${this.apiUrl}/recent`,
      { params },
    );
  }

  /**
   * Fetch documents expiring soon
   * @param daysWindow — number of days to look ahead (default 30)
   */
  getExpiringDocuments(daysWindow: number = 30): Observable<
    ApiResponse<{ documents: DashboardDocument[] }>
  > {
    let params = new HttpParams();
    if (daysWindow) {
      params = params.set('daysWindow', daysWindow.toString());
    }
    return this.http.get<ApiResponse<{ documents: DashboardDocument[] }>>(
      `${this.apiUrl}/expiring`,
      { params },
    );
  }

  /**
   * Fetch documents with processing errors
   */
  getProcessingErrors(): Observable<
    ApiResponse<{ documents: DashboardDocument[] }>
  > {
    return this.http.get<ApiResponse<{ documents: DashboardDocument[] }>>(
      `${this.apiUrl}/errors`,
    );
  }
}
