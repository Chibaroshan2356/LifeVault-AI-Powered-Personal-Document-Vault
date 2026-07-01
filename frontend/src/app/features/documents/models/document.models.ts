/**
 * document.models.ts — Document TypeScript Interfaces
 * Mirror the backend API contract exactly.
 */

export interface DocumentListItem {
  _id:              string;
  originalFileName: string;
  mimeType:         string;
  fileSize:         number;
  category:         string;
  status:           DocumentStatus;
  uploadedAt:       string;
}

export interface DocumentDetail extends DocumentListItem {
  storagePath:       string;
  ocrText:           string;
  ocrConfidence:     number;
  metadata:          DocumentMetadata;
  processingHistory: ProcessingHistoryEntry[];
  expiryDate:        string | null;
  errorMessage:      string | null;
  aiVersionInfo?:    any;
}

export enum DocumentCategory {
  AADHAAR_CARD             = 'Aadhaar Card',
  PAN_CARD                 = 'PAN Card',
  PASSPORT                 = 'Passport',
  DRIVING_LICENSE          = 'Driving License',
  VOTER_ID                 = 'Voter ID',
  BIRTH_CERTIFICATE        = 'Birth Certificate',
  RESUME                   = 'Resume',
  DEGREE_CERTIFICATE       = 'Degree Certificate',
  MARKSHEET                = 'Marksheet',
  EDUCATIONAL_CERTIFICATE  = 'Educational Certificate',
  INTERNSHIP_CERTIFICATE   = 'Internship Certificate',
  EMPLOYMENT_DOCUMENT      = 'Employment Document',
  MEDICAL_REPORT           = 'Medical Report',
  INSURANCE_DOCUMENT       = 'Insurance Document',
  BANK_STATEMENT           = 'Bank Statement',
  SALARY_SLIP              = 'Salary Slip',
  INVOICE                  = 'Invoice',
  WARRANTY_CARD            = 'Warranty Card',
  FEE_RECEIPT              = 'Fee Receipt',
  IDENTITY_CARD            = 'Identity Card',
  OTHER                    = 'Other',
}

export interface DocumentMetadata {
  holderName?:     string;
  documentName?:   string;
  organization?:   string;
  issueDate?:      string;
  expiryDate?:     string;
  documentNumber?: string;
}

export interface ProcessingHistoryEntry {
  stage:      string;
  status:     string;
  timestamp:  string;
  durationMs?: number;
  error?:     string;
}

export enum DocumentStatus {
  UPLOADED                 = 'UPLOADED',
  OCR_PENDING              = 'OCR_PENDING',
  OCR_COMPLETED            = 'OCR_COMPLETED',
  EXTRACTION_PENDING       = 'EXTRACTION_PENDING',
  EXTRACTION_COMPLETED     = 'EXTRACTION_COMPLETED',
  CLASSIFICATION_PENDING   = 'CLASSIFICATION_PENDING',
  CLASSIFICATION_COMPLETED = 'CLASSIFICATION_COMPLETED',
  READY                    = 'READY',
  FAILED                   = 'FAILED',
}

export interface UploadResponse {
  documentId: string;
}

export interface PaginationMeta {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
}
