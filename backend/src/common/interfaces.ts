/**
 * interfaces.ts - Shared TypeScript Interfaces
 *
 * These interfaces define the contract between modules.
 * Services return these types; controllers consume them.
 * This allows services to be tested independently of Express.
 */
import { DocumentStatus, DocumentCategory } from './enums';

/** Authenticated user attached to req.user by the JWT middleware */
export interface AuthenticatedUser {
  id:    string;
  email: string;
  role:  string;
}

/** AI pipeline result returned by the AI service and stored in MongoDB */
export interface AIProcessingResult {
  ocrText:            string;
  ocrConfidence:      number;
  category:           DocumentCategory;
  classificationConfidence: number;
  metadata:           DocumentMetadataFields;
  processingTime:     number;
  aiVersionInfo:      AIVersionInfo;
}

/** Structured metadata fields extracted from a document */
export interface DocumentMetadataFields {
  holderName?:     string;
  documentName?:   string;
  organization?:   string;
  issueDate?:      Date;
  expiryDate?:     Date;
  documentNumber?: string;
}

/**
 * AI versioning info stored alongside every OCR result.
 * Enables future comparison between model versions.
 */
export interface AIVersionInfo {
  ocrEngine:               string;   // e.g. "DocTR"
  ocrVersion:              string;   // e.g. "0.8.1"
  classificationModel:     string;   // e.g. "RuleBased" | "LayoutLMv3"
  classificationVersion:   string;   // e.g. "1.0"
}

/** Pagination query parameters */
export interface PaginationQuery {
  page:  number;
  limit: number;
}

/** Background job payload passed to the OCR queue */
export interface OCRJobPayload {
  documentId: string;
  userId:     string;
  filePath:   string;
  mimeType:   string;
}
