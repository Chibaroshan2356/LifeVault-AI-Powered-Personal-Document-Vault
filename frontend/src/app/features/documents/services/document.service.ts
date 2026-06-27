/**
 * document.service.ts — Document API Service
 *
 * Communicates with POST /api/v1/documents/upload and related endpoints.
 * Upload uses HttpClient with reportProgress:true to track progress.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpParams, HttpRequest } from '@angular/common/http';
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

/** Search query parameters */
export interface SearchParams {
  q?:         string;  // full-text OCR search
  holder?:    string;  // holder name
  docname?:   string;  // document name
  org?:       string;  // organization
  docnumber?: string;  // document number
  category?:  string;  // filter
  status?:    string;  // filter
  mimeType?:  string;  // filter
  minSize?:   number;  // filter
  maxSize?:   number;  // filter
  fromDate?:  string;  // filter
  toDate?:    string;  // filter
  sort?:      string;  // 'newest' | 'oldest' | 'name' | 'size'
  page?:      number;  // default 1
  limit?:     number;  // default 10
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

  /** Search documents with advanced filters */
  search(params: SearchParams): Observable<{ documents: DocumentListItem[]; pagination: PaginationMeta }> {
    let httpParams = new HttpParams();

    // Add query parameters if provided
    if (params.q)        httpParams = httpParams.set('q', params.q);
    if (params.holder)   httpParams = httpParams.set('holder', params.holder);
    if (params.docname)  httpParams = httpParams.set('docname', params.docname);
    if (params.org)      httpParams = httpParams.set('org', params.org);
    if (params.docnumber) httpParams = httpParams.set('docnumber', params.docnumber);
    if (params.category) httpParams = httpParams.set('category', params.category);
    if (params.status)   httpParams = httpParams.set('status', params.status);
    if (params.mimeType) httpParams = httpParams.set('mimeType', params.mimeType);
    if (params.minSize !== undefined) httpParams = httpParams.set('minSize', params.minSize.toString());
    if (params.maxSize !== undefined) httpParams = httpParams.set('maxSize', params.maxSize.toString());
    if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate)   httpParams = httpParams.set('toDate', params.toDate);
    if (params.sort)     httpParams = httpParams.set('sort', params.sort);
    if (params.page)     httpParams = httpParams.set('page', params.page.toString());
    if (params.limit)    httpParams = httpParams.set('limit', params.limit.toString());

    return this.http
      .get<ApiResponse<DocumentListItem[]>>(`${this.url}/search/query`, { params: httpParams })
      .pipe(
        map((res) => ({
          documents:  res.data ?? [],
          pagination: res.pagination ?? { page: params.page ?? 1, limit: params.limit ?? 10, total: 0, totalPages: 0 },
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
