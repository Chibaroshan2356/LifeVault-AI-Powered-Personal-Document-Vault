import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface SmartFolder {
  id:    string;
  name:  string;
  icon:  string;
  emoji: string;
  count: number;
}

export interface SmartFolderDocument {
  _id:              string;
  originalFileName: string;
  mimeType:         string;
  fileSize:         number;
  category:         string;
  status:           string;
  smartFolder:      string;
  uploadedAt:       Date;
  createdAt:        Date;
  metadata?: {
    holderName?:     string;
    documentName?:   string;
    organization?:   string;
    documentNumber?: string;
  };
}

export interface SmartFolderDetail {
  folderName: string;
  emoji:      string;
  icon:       string;
  documents:  SmartFolderDocument[];
}

interface ApiResponse<T> {
  success: boolean;
  data?:   T;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class SmartFolderService {
  private readonly apiUrl = `${environment.apiUrl}/smart-folders`;

  constructor(private readonly http: HttpClient) {}

  /** Fetch all 7 Smart Folders with document counts */
  list(): Observable<ApiResponse<SmartFolder[]>> {
    return this.http.get<ApiResponse<SmartFolder[]>>(this.apiUrl);
  }

  /** Fetch documents inside a specific Smart Folder */
  getDetail(folderName: string): Observable<ApiResponse<SmartFolderDetail>> {
    return this.http.get<ApiResponse<SmartFolderDetail>>(`${this.apiUrl}/${encodeURIComponent(folderName)}`);
  }
}
