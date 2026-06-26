/**
 * enums.ts - Application-wide Enumerations
 *
 * Centralizing enums here prevents magic strings scattered across the codebase.
 * Both Mongoose models and service layer import from this file.
 */

/**
 * ProcessingStage — maps to processingHistory entries in Document model.
 * Every stage is recorded with a timestamp and duration for the UI timeline.
 */
export enum ProcessingStage {
  UPLOAD         = 'UPLOAD',
  OCR            = 'OCR',
  EXTRACTION     = 'EXTRACTION',
  CLASSIFICATION = 'CLASSIFICATION',
  METADATA       = 'METADATA',
  INDEXING       = 'INDEXING',
}

/**
 * ProcessingStageStatus — result of each pipeline stage
 */
export enum ProcessingStageStatus {
  STARTED   = 'started',
  COMPLETED = 'completed',
  FAILED    = 'failed',
}

/**
 * DocumentStatus — overall document processing state
 *
 * Lifecycle:
 *  UPLOADED → OCR_PENDING → OCR_COMPLETED
 *           → EXTRACTION_PENDING → EXTRACTION_COMPLETED
 *           → CLASSIFICATION_PENDING → CLASSIFICATION_COMPLETED
 *           → READY
 *
 * FAILED can occur at any stage.
 */
export enum DocumentStatus {
  UPLOADED                    = 'UPLOADED',
  OCR_PENDING                 = 'OCR_PENDING',
  OCR_COMPLETED               = 'OCR_COMPLETED',
  EXTRACTION_PENDING          = 'EXTRACTION_PENDING',
  EXTRACTION_COMPLETED        = 'EXTRACTION_COMPLETED',
  CLASSIFICATION_PENDING      = 'CLASSIFICATION_PENDING',
  CLASSIFICATION_COMPLETED    = 'CLASSIFICATION_COMPLETED',
  READY                       = 'READY',
  FAILED                      = 'FAILED',
}

/**
 * DocumentCategory — known document types produced by the classifier
 */
export enum DocumentCategory {
  AADHAAR_CARD         = 'Aadhaar Card',
  PAN_CARD             = 'PAN Card',
  PASSPORT             = 'Passport',
  DRIVING_LICENSE      = 'Driving License',
  VOTER_ID             = 'Voter ID',
  BIRTH_CERTIFICATE    = 'Birth Certificate',
  DEGREE_CERTIFICATE   = 'Degree Certificate',
  MARKSHEET            = 'Marksheet',
  BANK_STATEMENT       = 'Bank Statement',
  SALARY_SLIP          = 'Salary Slip',
  INVOICE              = 'Invoice',
  OTHER                = 'Other',
}

/**
 * UserRole — authorization levels
 */
export enum UserRole {
  USER  = 'user',
  ADMIN = 'admin',
}

/**
 * NotificationType — notification categories
 */
export enum NotificationType {
  EXPIRY_WARNING          = 'expiry_warning',
  PROCESSING_COMPLETE     = 'processing_complete',
  PROCESSING_FAILED       = 'processing_failed',
}
