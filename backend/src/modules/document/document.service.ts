/**
 * document.service.ts — Document Business Logic
 *
 * Responsibilities:
 *  upload()      — save file, create DB record, enqueue OCR job
 *  findByUser()  — paginated list of user's documents
 *  findById()    — single document (ownership check)
 *  deleteById()  — delete DB record + file from storage
 *
 * Dependencies:
 *  DocumentModel        — MongoDB collection
 *  LocalStorageService  — file persistence (swappable to S3)
 *  jobQueue             — background OCR job queue
 *
 * Upload file path strategy:
 *  uploads/{userId}/{year}/{uuid}.{ext}
 *  Example: uploads/64f3a1.../2026/a3c7f2b1.pdf
 */
import path from 'path';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { DocumentModel }          from './document.model';
import { StorageFactory }         from '../../common/storage.factory';
import { appConfig }              from '../../config/app.config';
import { jobQueue }               from '../../common/job-queue.service';
import { HttpError }              from '../../middleware/error.middleware';
import { logger }                 from '../../utils/logger';
import { DocumentStatus, DocumentCategory, ProcessingStage, ProcessingStageStatus } from '../../common/enums';
import { ApiResponse, PaginationMeta } from '../../utils/ApiResponse';
import { escapeRegex }            from '../../utils/regex.util';
import { validateObjectKey }      from '../../utils/storage-key.util';
import type { ListDocumentsDto, SearchDocumentsDto }  from './document.validator';

/** Shape of data returned for a document list item */
export interface DocumentListItem {
  _id:              string;
  originalFileName: string;
  mimeType:         string;
  fileSize:         number;
  category:         string;
  status:           string;
  uploadedAt:       Date;
}

class DocumentService {

  // ------------------------------------------------------------------
  // Upload
  // ------------------------------------------------------------------

  /**
   * Saves the uploaded file and creates a MongoDB record.
   * Returns 202 — processing happens asynchronously via jobQueue.
   *
   * @param file     — Multer file object (buffer in memory)
   * @param userId   — authenticated user's ID
   */
  async upload(
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ documentId: string }> {

    const startTime = Date.now();

    // 1. Compute SHA-256 hash of the raw file bytes BEFORE writing to disk.
    //    This is the value anchored on the blockchain for integrity verification.
    const fileHash = createHash('sha256').update(file.buffer).digest('hex');

    // 2. Build storage path: userId/year/uuid.ext
    const ext         = path.extname(file.originalname).toLowerCase() || this.mimeToExt(file.mimetype);
    const storedName  = `${uuidv4()}${ext}`;
    const year        = new Date().getFullYear().toString();
    const storagePath = `${userId}/${year}/${storedName}`;

    // 3. Persist file via selected storage provider (B2 or Local)
    const currentProvider = appConfig.storageProvider === 'b2' && appConfig.b2KeyId && appConfig.b2ApplicationKey ? 'b2' : 'local';
    const storage = StorageFactory.getService(currentProvider);
    await storage.save(file.buffer, storedName, file.mimetype, `${userId}/${year}`);

    // 4. Create MongoDB document record with fileHash and storageProvider embedded
    const doc = await DocumentModel.create({
      userId:           new mongoose.Types.ObjectId(userId),
      originalFileName: file.originalname,
      storedFileName:   storedName,
      storagePath,
      storageProvider:  currentProvider,
      mimeType:         file.mimetype,
      fileSize:         file.size,
      category:         DocumentCategory.OTHER,
      status:           DocumentStatus.UPLOADED,
      // Store the hash immediately — blockchain registration happens in the background
      blockchainIntegrity: {
        fileHash,
        verificationStatus: 'pending',
      },
      processingHistory: [
        {
          stage:      ProcessingStage.UPLOAD,
          status:     ProcessingStageStatus.COMPLETED,
          timestamp:  new Date(),
          durationMs: Date.now() - startTime,
        },
      ],
    });

    const documentId = (doc._id as mongoose.Types.ObjectId).toString();

    // 5. Enqueue background OCR job — pass fileHash for blockchain registration
    await jobQueue.enqueue({
      documentId,
      userId,
      filePath: storagePath,
      mimeType: file.mimetype,
      fileHash,
    });

    logger.info('Document uploaded', {
      documentId,
      userId,
      originalFileName: file.originalname,
      fileSize:         file.size,
      storagePath,
      fileHash,
    });

    return { documentId };
  }

  // ------------------------------------------------------------------
  // List
  // ------------------------------------------------------------------

  /**
   * Returns a paginated list of documents belonging to the user.
   */
  async findByUser(
    userId: string,
    dto: ListDocumentsDto,
  ): Promise<{ documents: DocumentListItem[]; pagination: PaginationMeta }> {

    const filter: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (dto.category) filter.category = dto.category;
    if (dto.status)   filter.status   = dto.status;

    const skip  = (dto.page - 1) * dto.limit;
    const total = await DocumentModel.countDocuments(filter);

    const docs = await DocumentModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(dto.limit)
      .select('_id originalFileName mimeType fileSize category status createdAt')
      .lean();

    const documents: DocumentListItem[] = docs.map((d) => ({
      _id:              d._id.toString(),
      originalFileName: d.originalFileName,
      mimeType:         d.mimeType,
      fileSize:         d.fileSize,
      category:         d.category,
      status:           d.status,
      uploadedAt:       d.createdAt,
    }));

    const pagination: PaginationMeta = {
      page:       dto.page,
      limit:      dto.limit,
      total,
      totalPages: Math.ceil(total / dto.limit),
    };

    return { documents, pagination };
  }

  // ------------------------------------------------------------------
  // Search
  // ------------------------------------------------------------------

  /**
   * Advanced search with full-text OCR search, metadata filters, and file filters.
   * Supports:
   *  - Full-text search on ocrText
   *  - Metadata searches: holder name, document name, organization, document number
   *  - Filters: category, status, file type, file size range, date range
   *  - Sorting: newest, oldest, name, size
   *  - Pagination
   */
  async search(
    userId: string,
    dto: SearchDocumentsDto,
  ): Promise<{ documents: DocumentListItem[]; pagination: PaginationMeta }> {

    const filter: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    // ── Full-text OCR search ──────────────────────────────────────
    // If query provided, search ocrText using MongoDB text index
    if (dto.q && dto.q.trim()) {
      filter.$text = { $search: dto.q };
    }

    // ── Metadata & Name searches (case-insensitive escaped regex) ─
    if (dto.holder && dto.holder.trim()) {
      filter['metadata.holderName'] = { $regex: escapeRegex(dto.holder.trim()), $options: 'i' };
    }
    if (dto.docname && dto.docname.trim()) {
      const escapedDocName = escapeRegex(dto.docname.trim());
      filter.$or = [
        { 'metadata.documentName': { $regex: escapedDocName, $options: 'i' } },
        { originalFileName: { $regex: escapedDocName, $options: 'i' } },
      ];
    }
    if (dto.org && dto.org.trim()) {
      filter['metadata.organization'] = { $regex: escapeRegex(dto.org.trim()), $options: 'i' };
    }
    if (dto.docnumber && dto.docnumber.trim()) {
      filter['metadata.documentNumber'] = { $regex: escapeRegex(dto.docnumber.trim()), $options: 'i' };
    }

    // ── Expiry status filter ───────────────────────────────────────
    if (dto.expiryStatus) {
      const now = new Date();
      if (dto.expiryStatus === 'expired') {
        filter.expiryDate = { $ne: null, $lt: now };
      } else if (dto.expiryStatus === 'expiringSoon') {
        const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        filter.expiryDate = { $ne: null, $gte: now, $lte: soon };
      } else if (dto.expiryStatus === 'active') {
        filter.expiryDate = { $gte: now };
      }
    }

    // ── Category and Status filters ───────────────────────────────
    if (dto.category) filter.category = dto.category;
    if (dto.status)   filter.status   = dto.status;

    // ── File type filter ──────────────────────────────────────────
    if (dto.mimeType) filter.mimeType = dto.mimeType;

    // ── File size range filter ────────────────────────────────────
    if (dto.minSize !== undefined || dto.maxSize !== undefined) {
      const sizeFilter: Record<string, unknown> = {};
      if (dto.minSize !== undefined) sizeFilter.$gte = dto.minSize;
      if (dto.maxSize !== undefined) sizeFilter.$lte = dto.maxSize;
      filter.fileSize = sizeFilter;
    }

    // ── Date range filter ─────────────────────────────────────────
    if (dto.fromDate || dto.toDate) {
      const dateFilter: Record<string, unknown> = {};
      if (dto.fromDate) dateFilter.$gte = new Date(dto.fromDate);
      if (dto.toDate)   dateFilter.$lte = new Date(dto.toDate);
      filter.createdAt = dateFilter;
    }

    // ── Sorting ───────────────────────────────────────────────────
    // Build sort specification based on search type
    type SortSpecType = { [key: string]: 1 | -1 | { $meta: string } };
    
    const getSortSpec = (hasTextSearch: boolean, sortOption: string): SortSpecType => {
      if (hasTextSearch) {
        return { score: { $meta: 'textScore' } };
      }
      switch (sortOption) {
        case 'oldest':
          return { createdAt: 1 };
        case 'name':
          return { originalFileName: 1 };
        case 'size':
          return { fileSize: -1 };
        case 'newest':
        default:
          return { createdAt: -1 };
      }
    };

    const sortSpec = getSortSpec(dto.q && dto.q.trim() ? true : false, dto.sort);

    // ── Execute query ────────────────────────────────────────────
    const skip  = (dto.page - 1) * dto.limit;
    const total = await DocumentModel.countDocuments(filter);

    // Use a separate type for lean results to avoid Mongoose typing issues
    interface LeanDocument {
      _id: any;
      originalFileName: string;
      mimeType: string;
      fileSize: number;
      category: string;
      status: string;
      createdAt: Date;
    }

    const docs = await DocumentModel
      .find(filter)
      .sort(sortSpec)
      .skip(skip)
      .limit(dto.limit)
      .select('_id originalFileName mimeType fileSize category status createdAt')
      .lean<LeanDocument[]>();

    const documents: DocumentListItem[] = docs.map((d) => ({
      _id:              d._id.toString(),
      originalFileName: d.originalFileName,
      mimeType:         d.mimeType,
      fileSize:         d.fileSize,
      category:         d.category,
      status:           d.status,
      uploadedAt:       d.createdAt,
    }));

    const pagination: PaginationMeta = {
      page:       dto.page,
      limit:      dto.limit,
      total,
      totalPages: Math.ceil(total / dto.limit),
    };

    logger.info('Search executed', {
      userId,
      filters: {
        q:        !!dto.q,
        holder:   !!dto.holder,
        docname:  !!dto.docname,
        org:      !!dto.org,
        docnumber: !!dto.docnumber,
        category: !!dto.category,
        status:   !!dto.status,
      },
      results: total,
      page: dto.page,
    });

    return { documents, pagination };
  }

  // ------------------------------------------------------------------
  // Find by ID
  // ------------------------------------------------------------------

  /**
   * Returns a single document, ensuring it belongs to the requesting user.
   * @throws HttpError 404 if not found
   * @throws HttpError 403 if document belongs to another user
   */
  async findById(documentId: string, userId: string): Promise<IDocument> {
    const doc = await DocumentModel.findById(documentId).lean();

    if (!doc) {
      throw new HttpError(404, 'Document not found');
    }

    if (doc.userId.toString() !== userId) {
      throw new HttpError(403, 'You do not have permission to access this document');
    }

    return doc as unknown as IDocument;
  }

  // ------------------------------------------------------------------
  // Delete
  // ------------------------------------------------------------------

  /**
   * Deletes the document record from MongoDB and the file from storage.
   * @throws HttpError 404 if not found
   * @throws HttpError 403 if ownership mismatch
   */
  async deleteById(documentId: string, userId: string): Promise<void> {
    const doc = await DocumentModel.findById(documentId);

    if (!doc) {
      throw new HttpError(404, 'Document not found');
    }

    if (doc.userId.toString() !== userId) {
      throw new HttpError(403, 'You do not have permission to delete this document');
    }

    // Delete file from storage (best effort — don't fail if file missing)
    try {
      const storage = StorageFactory.getService(doc.storageProvider);
      await storage.delete(doc.storagePath);
    } catch {
      logger.warn('File not found during delete — skipping storage deletion', {
        storagePath: doc.storagePath,
        storageProvider: doc.storageProvider,
        documentId,
      });
    }

    await DocumentModel.deleteOne({ _id: documentId });

    logger.info('Document deleted', { documentId, userId });
  }

  // ------------------------------------------------------------------
  // Secure File Retrieval (Download / View)
  // ------------------------------------------------------------------

  /**
   * Loads a document file buffer and metadata with strict ownership enforcement.
   * @throws HttpError 404 if document or file not found
   * @throws HttpError 403 if ownership mismatch
   */
  async getFile(
    documentId: string,
    userId: string,
  ): Promise<{
    buffer:           Buffer;
    originalFileName: string;
    mimeType:         string;
    fileSize:         number;
    document:         IDocument;
  }> {
    const doc = await this.findById(documentId, userId);

    // Validate storage path against directory traversal
    validateObjectKey(doc.storagePath);

    let buffer: Buffer;
    try {
      const storage = StorageFactory.getService(doc.storageProvider);
      buffer = await storage.get(doc.storagePath);
    } catch (err: any) {
      throw new HttpError(404, `Physical document file not found: ${err.message}`);
    }

    return {
      buffer,
      originalFileName: doc.originalFileName,
      mimeType:         doc.mimeType,
      fileSize:         doc.fileSize,
      document:         doc,
    };
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  private mimeToExt(mime: string): string {
    const map: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/jpeg':      '.jpg',
      'image/jpg':       '.jpg',
      'image/png':       '.png',
    };
    return map[mime] ?? '';
  }
}

// Re-export IDocument for controller use
import type { IDocument } from './document.model';

export const documentService = new DocumentService();
