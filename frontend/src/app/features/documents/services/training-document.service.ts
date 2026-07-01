import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AIProcessResult {
  success:                   boolean;
  document_id:               string;
  ocr_text:                  string;
  ocr_confidence:            number;
  document_type:             string;
  classification_confidence: number;
  metadata: {
    documentName?:   string | null;
    holderName?:     string | null;
    organization?:   string | null;
    documentNumber?: string | null;
    issueDate?:      string | null;
    expiryDate?:     string | null;
  };
  processing_time: number;
  version_info: {
    ocr_engine:             string;
    ocr_version:            string;
    classification_model:   string;
    classification_version: string;
  };
  error?: string;
}

export interface TrainingUploadResponse {
  storagePath: string;
  aiResult: AIProcessResult;
}

export interface SaveTrainingDto {
  originalFilePath:  string;
  ocrText:           string;
  aiCategory:        string;
  aiMetadata:        any;
  correctedMetadata: any;
  finalCategory:     string;
  version?:          string;
}

@Injectable({ providedIn: 'root' })
export class TrainingDocumentService {
  private readonly url = `${environment.apiUrl}/documents/training`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Uploads file for sync processing and returns AI parsed result and temporary path.
   */
  upload(file: File): Observable<TrainingUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<{ success: boolean; data: TrainingUploadResponse }>(`${this.url}/upload`, formData)
      .pipe(map((res) => res.data));
  }

  /**
   * Saves approved training corrections to MongoDB.
   */
  saveCorrections(dto: SaveTrainingDto): Observable<{ success: boolean; id: string }> {
    return this.http
      .post<{ success: boolean; data: { success: boolean; id: string } }>(`${this.url}/save`, dto)
      .pipe(map((res) => res.data));
  }
}
