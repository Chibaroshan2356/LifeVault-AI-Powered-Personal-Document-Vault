/**
 * upload.middleware.ts — Multer File Upload Configuration
 *
 * Responsibilities:
 *  - Accept only PDF, PNG, JPG, JPEG (by MIME type)
 *  - Reject files larger than 10 MB
 *  - Reject empty files (0 bytes)
 *  - Store uploaded file to a temp path — DocumentService moves it
 *    to the final user-based hierarchy after creating the DB record
 *
 * Why memory storage here?
 *  We store to memory buffer first so DocumentService can compute
 *  the final storagePath (which includes userId) before writing to disk.
 *  For large files in production, switch to diskStorage with a tmp dir.
 */
import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { ALLOWED_MIME_TYPES } from '../modules/document/document.validator';
import { HttpError } from './error.middleware';
import { appConfig } from '../config/app.config';

/** File filter — rejects unsupported MIME types immediately */
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void => {
  const isAllowed = (ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype);

  if (!isAllowed) {
    cb(
      new HttpError(
        415,
        `Unsupported file type: ${file.mimetype}. Allowed: PDF, PNG, JPG, JPEG`,
      ),
    );
    return;
  }

  cb(null, true);
};

/**
 * Multer instance configured for memory storage.
 * The file buffer is available as req.file.buffer in the controller.
 */
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: appConfig.maxFileSize,   // 10 MB default
    files:    1,                        // one file per request
  },

  fileFilter,
}).single('file');   // form field name must be "file"

/**
 * Validates the uploaded file after Multer processes it.
 * Called as a second middleware after uploadMiddleware.
 *
 * Checks:
 *  - File was actually provided
 *  - File is not empty (0 bytes)
 */
export const validateUploadedFile = (
  req: Request,
): void => {
  if (!req.file) {
    throw new HttpError(400, 'No file provided. Please include a file in the "file" field.');
  }

  if (req.file.size === 0) {
    throw new HttpError(400, 'File is empty. Please upload a valid document.');
  }
};
