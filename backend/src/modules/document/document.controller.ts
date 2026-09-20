/**
 * document.controller.ts — Document HTTP Controllers
 *
 * Thin layer: parse request → call service → return ApiResponse.
 * No business logic here.
 */
import { Request, Response, NextFunction } from 'express';
import { documentService }  from './document.service';
import { ApiResponse }      from '../../utils/ApiResponse';
import { validateUploadedFile } from '../../middleware/upload.middleware';
import { ListDocumentsSchema, SearchDocumentsSchema }  from './document.validator';
import { securityAuditService } from '../security/security-audit.service';
import { SecurityAction, SecurityStatus } from '../security/security.types';
import { emailService } from '../../common/email.service';
import { logger } from '../../utils/logger';


// ------------------------------------------------------------------
// POST /api/v1/documents/upload
// ------------------------------------------------------------------

/**
 * @swagger
 * /documents/upload:
 *   post:
 *     summary: Upload a document (PDF, PNG, JPG, JPEG)
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PDF or image file (max 10 MB)
 *     responses:
 *       202:
 *         description: Document uploaded — OCR processing queued
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         documentId: { type: string }
 *       400:
 *         description: No file, empty file, or validation error
 *       401:
 *         description: Unauthorized
 *       415:
 *         description: Unsupported file type
 *       500:
 *         description: Internal server error
 */
export const uploadDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    validateUploadedFile(req);

    const userId = req.user!.sub;
    const result = await documentService.upload(req.file!, userId);

    res.status(202).json(
      ApiResponse.success('Document uploaded — processing queued', result),
    );
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// GET /api/v1/documents
// ------------------------------------------------------------------

/**
 * @swagger
 * /documents:
 *   get:
 *     summary: List all documents for the authenticated user
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Document list returned
 *       401:
 *         description: Unauthorized
 */
export const listDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto    = ListDocumentsSchema.parse(req.query);
    const userId = req.user!.sub;
    const { documents, pagination } = await documentService.findByUser(userId, dto);

    res.status(200).json(
      ApiResponse.success('Documents retrieved', documents, pagination),
    );
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// GET /api/v1/documents/:id
// ------------------------------------------------------------------

/**
 * @swagger
 * /documents/{id}:
 *   get:
 *     summary: Get a single document by ID
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Document returned
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
export const getDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const doc = await documentService.findById(req.params.id, req.user!.sub);
    res.status(200).json(ApiResponse.success('Document retrieved', doc));
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// DELETE /api/v1/documents/:id
// ------------------------------------------------------------------

/**
 * @swagger
 * /documents/{id}:
 *   delete:
 *     summary: Delete a document and its file
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Document deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
export const deleteDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await documentService.deleteById(req.params.id, req.user!.sub);
    res.status(200).json(ApiResponse.success('Document deleted'));
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// GET /api/v1/documents/search/query
// ------------------------------------------------------------------

/**
 * @swagger
 * /documents/search/query:
 *   get:
 *     summary: Search documents with advanced filters
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Full-text search query on OCR text
 *       - in: query
 *         name: holder
 *         schema: { type: string }
 *         description: Search in holder name
 *       - in: query
 *         name: docname
 *         schema: { type: string }
 *         description: Search in document name
 *       - in: query
 *         name: org
 *         schema: { type: string }
 *         description: Search in organization
 *       - in: query
 *         name: docnumber
 *         schema: { type: string }
 *         description: Search in document number
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Filter by document category
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Filter by processing status
 *       - in: query
 *         name: mimeType
 *         schema: { type: string }
 *         description: Filter by file type (application/pdf, image/jpeg, etc)
 *       - in: query
 *         name: minSize
 *         schema: { type: integer }
 *         description: Minimum file size in bytes
 *       - in: query
 *         name: maxSize
 *         schema: { type: integer }
 *         description: Maximum file size in bytes
 *       - in: query
 *         name: fromDate
 *         schema: { type: string, format: date-time }
 *         description: From date (ISO 8601)
 *       - in: query
 *         name: toDate
 *         schema: { type: string, format: date-time }
 *         description: To date (ISO 8601)
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [newest, oldest, name, size], default: newest }
 *         description: Sort order
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Search results returned
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid query parameters
 */
export const searchDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto    = SearchDocumentsSchema.parse(req.query);
    const userId = req.user!.sub;
    const { documents, pagination } = await documentService.search(userId, dto);

    res.status(200).json(
      ApiResponse.success('Search completed', documents, pagination),
    );
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// GET /api/v1/documents/:id/download
// ------------------------------------------------------------------

/**
 * @swagger
 * /documents/{id}/download:
 *   get:
 *     summary: Securely download document file (enforces ownership, audit log, email alert)
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Document binary stream
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document or physical file not found
 */
export const downloadDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.sub;
    const userEmail = req.user!.email;
    const { id } = req.params;
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // 1. Ownership & file verification
    const fileResult = await documentService.getFile(id, userId);

    // 2. Record successful download event in security audit log
    await securityAuditService.recordEvent({
      userId,
      documentId: id,
      action:     SecurityAction.DOCUMENT_DOWNLOAD,
      status:     SecurityStatus.SUCCESS,
      ipAddress,
      userAgent,
      details:    `Downloaded file: ${fileResult.originalFileName}`,
    });

    // 3. Dispatch download security alert email (non-blocking)
    if (userEmail) {
      emailService
        .sendDownloadAlertEmail(
          userEmail,
          userEmail.split('@')[0],
          fileResult.originalFileName,
          new Date(),
        )
        .catch((emailErr) => {
          logger.warn('[DOWNLOAD ALERT] Failed to send download security email', {
            error: emailErr.message,
            documentId: id,
            userId,
          });
        });
    }

    // 4. Check for high-volume download anomaly (suspicious activity)
    securityAuditService.checkSuspiciousDownloads(userId).catch(() => {});

    // 5. Send file with download headers
    res.setHeader('Content-Type', fileResult.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileResult.originalFileName)}"`,
    );
    res.setHeader('Content-Length', fileResult.buffer.length);
    res.status(200).send(fileResult.buffer);
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// GET /api/v1/documents/:id/file
// ------------------------------------------------------------------

/**
 * @swagger
 * /documents/{id}/file:
 *   get:
 *     summary: Stream document file for inline viewing (enforces ownership & view audit)
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Document binary stream (inline)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document or physical file not found
 */
export const streamDocumentFile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.sub;
    const { id } = req.params;
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // 1. Ownership & file verification
    const fileResult = await documentService.getFile(id, userId);

    // 2. Record view audit event
    await securityAuditService.recordEvent({
      userId,
      documentId: id,
      action:     SecurityAction.DOCUMENT_VIEW,
      status:     SecurityStatus.SUCCESS,
      ipAddress,
      userAgent,
      details:    `Viewed file: ${fileResult.originalFileName}`,
    });

    // 3. Send file inline
    res.setHeader('Content-Type', fileResult.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(fileResult.originalFileName)}"`,
    );
    res.setHeader('Content-Length', fileResult.buffer.length);
    res.status(200).send(fileResult.buffer);
  } catch (err) {
    next(err);
  }
};

