/**
 * document.service.ts — Document API Service
 *
 * Communicates with POST /api/v1/documents/upload and related endpoints.
 * Upload uses HttpClient with reportProgress:true to track progress.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpRequest } from '@angular/common/http';
import { Observable, map, filter } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  DocumentListItem,
  DocumentDetail,
  UploadResponse,
  PaginationMeta,
} from '../models/document.models';

interface ApiResponse<T> {
  success:    boolean;
  message:    string;
  data?:      T;
  pagination?: PaginationMeta;
}

export interface UploadProgress {
  type:       'progress' | 'complete' | 'error';
  percent?:   number;
  documentId?: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly url = `${environment.apiUrl}/documents`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Upload a file with progress tracking.
   * Emits UploadProgress events as the file uploads.
   */
  upload(file: File): Observable<UploadProgress> {
    const formData = new FormData();
    formData.append('file', file);

    const req = new HttpRequest('POST', `${this.url}/upload`, formData, {
      reportProgress: true,
    });

    return this.http.request<ApiResponse<UploadResponse>>(req).pipe(
      map((event): UploadProgress | null => {
        if (event.type === HttpEventType.UploadProgress) {
          const percent = event.total
            ? Math.round((100 * event.loaded) / event.total)
            : 0;
          return { type: 'progress', percent };
        }

        if (event.type === HttpEventType.Response) {
          return {
            type:       'complete',
            documentId: event.body?.data?.documentId,
          };
        }

        return null;
      }),
      filter((v): v is UploadProgress => v !== null),
    );
  }

  /** List documents (paginated) */
  list(page = 1, limit = 10): Observable<{ documents: DocumentListItem[]; pagination: PaginationMeta }> {
    return this.http
      .get<ApiResponse<DocumentListItem[]>>(`${this.url}?page=${page}&limit=${limit}`)
      .pipe(
        map((res) => ({
          documents:  res.data ?? [],
          pagination: res.pagination ?? { page, limit, total: 0, totalPages: 0 },
        })),
      );
  }

  /** Get single document */
  getById(id: string): Observable<DocumentDetail> {
    return this.http
      .get<ApiResponse<DocumentDetail>>(`${this.url}/${id}`)
      .pipe(map((res) => res.data!));
  }

  /** Delete document */
  delete(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<null>>(`${this.url}/${id}`)
      .pipe(map(() => undefined));
  }
}
