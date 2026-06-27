/**
 * document.routes.ts — Document Route Definitions
 *
 * All routes under /api/v1/documents (mounted in modules/index.ts).
 * All routes require authentication.
 *
 * Upload uses a dedicated rate limiter — stricter than the global one
 * to prevent abuse (large file uploads are expensive).
 */

/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Document upload, retrieval and management
 */
import { Router }         from 'express';
import rateLimit          from 'express-rate-limit';
import { authenticate }   from '../../middleware/authenticate.middleware';
import { uploadMiddleware } from '../../middleware/upload.middleware';
import {
  uploadDocument,
  listDocuments,
  searchDocuments,
  getDocument,
  deleteDocument,
} from './document.controller';

export const documentRouter = Router();

// All document routes require a valid JWT
documentRouter.use(authenticate);

/** Stricter rate limit for uploads: 20 per 15 minutes per user IP */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { success: false, message: 'Too many upload requests. Please wait.' },
});

// Routes (search MUST be before /:id to avoid param capture)
documentRouter.post(  '/upload',        uploadLimiter, uploadMiddleware, uploadDocument);
documentRouter.get(   '/search/query',  searchDocuments);
documentRouter.get(   '/',              listDocuments);
documentRouter.get(   '/:id',           getDocument);
documentRouter.delete('/:id',           deleteDocument);
