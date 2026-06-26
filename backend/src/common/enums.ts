/**
 * enums.ts - Application-wide Enumerations
 *
 * Centralizing enums here prevents magic strings scattered across the codebase.
 * Both Mongoose models and service layer import from this file.
 */

/**
 * DocumentStatus — granular pipeline states
 *
 * Lifecycle:
 *  UPLOADED → OCR_PENDING → OCR_COMPLETED
 *           → CLASSIFICATION_PENDING → CLASSIFICATION_COMPLETED
 *           → EXTRACTION_PENDING → READY
 *
 * FAILED can occur at any stage.
 * This granularity enables:
 *  - Precise retry logic (retry from the failed stage, not from scratch)
 *  - Progress indicators in the UI
 *  - Easier debugging ("failed during OCR" vs "failed during classification")
 */
export enum DocumentStatus {
  UPLOADED                  = 'UPLOADED',
  OCR_PENDING               = 'OCR_PENDING',
  OCR_COMPLETED             = 'OCR_COMPLETED',
  CLASSIFICATION_PENDING    = 'CLASSIFICATION_PENDING',
  CLASSIFICATION_COMPLETED  = 'CLASSIFICATION_COMPLETED',
  EXTRACTION_PENDING        = 'EXTRACTION_PENDING',
  READY                     = 'READY',
  FAILED                    = 'FAILED',
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
