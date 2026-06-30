/**
 * document.model.ts — Document Mongoose Schema
 *
 * Collection: documents
 *
 * Design decisions:
 *  - storagePath stores the relative path within uploads/ e.g. "userId/2026/uuid.pdf"
 *    This makes the storage layer swappable — LocalStorage uses it as a file path,
 *    S3Storage would use it as an object key.
 *  - status uses the DocumentStatus enum for granular pipeline tracking
 *  - processingHistory is an array — each pipeline stage appends an entry
 *  - ocrText, metadata, aiVersionInfo are empty on upload, populated by AI pipeline
 *  - expiryDate is denormalized from metadata for fast query (expiry alert queries)
 */
import mongoose, { Schema, Document, Model } from 'mongoose';
import { DocumentStatus, DocumentCategory } from '../../common/enums';

/** Processing history entry — one per pipeline stage */
export interface IProcessingHistoryEntry {
  stage:      string;
  status:     string;
  timestamp:  Date;
  durationMs?: number;
  error?:     string;
}

/** AI version metadata stored alongside every OCR result */
export interface IAIVersionInfo {
  ocrEngine:             string;
  ocrVersion:            string;
  classificationModel:   string;
  classificationVersion: string;
}

/** Extracted document metadata (populated by AI pipeline) */
export interface IDocumentMetadata {
  holderName?:     string;
  documentName?:   string;
  organization?:   string;
  issueDate?:      Date;
  expiryDate?:     Date;
  documentNumber?: string;
}

/** Full document interface */
export interface IDocument extends Document {
  userId:            mongoose.Types.ObjectId;
  originalFileName:  string;
  storedFileName:    string;
  storagePath:       string;   // relative: "userId/2026/uuid.pdf"
  mimeType:          string;
  fileSize:          number;
  category:          DocumentCategory;
  status:            DocumentStatus;
  processingHistory: IProcessingHistoryEntry[];
  ocrText:           string;
  ocrConfidence:     number;
  metadata:          IDocumentMetadata;
  aiVersionInfo:     IAIVersionInfo | null;
  expiryDate:        Date | null;
  errorMessage:      string | null;
  createdAt:         Date;
  updatedAt:         Date;
}

const ProcessingHistorySchema = new Schema<IProcessingHistoryEntry>(
  {
    stage:      { type: String, required: true },
    status:     { type: String, required: true },
    timestamp:  { type: Date, default: Date.now },
    durationMs: { type: Number },
    error:      { type: String },
  },
  { _id: false },
);

const DocumentMetadataSchema = new Schema<IDocumentMetadata>(
  {
    holderName:     String,
    documentName:   String,
    organization:   String,
    issueDate:      Date,
    expiryDate:     Date,
    documentNumber: String,
  },
  { _id: false },
);

const AIVersionInfoSchema = new Schema<IAIVersionInfo>(
  {
    ocrEngine:             { type: String, default: 'EasyOCR' },
    ocrVersion:            { type: String, default: '' },
    classificationModel:   { type: String, default: 'RuleBased' },
    classificationVersion: { type: String, default: '1.0' },
  },
  { _id: false },
);

const DocumentSchema = new Schema<IDocument>(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },

    originalFileName: {
      type:     String,
      required: true,
      trim:     true,
    },

    storedFileName: {
      type:     String,
      required: true,
    },

    /** Relative path from the uploads root, e.g. "userId/2026/uuid.pdf" */
    storagePath: {
      type:     String,
      required: true,
    },

    mimeType: {
      type:     String,
      required: true,
    },

    fileSize: {
      type:     Number,
      required: true,
    },

    category: {
      type:    String,
      enum:    Object.values(DocumentCategory),
      default: DocumentCategory.OTHER,
    },

    status: {
      type:    String,
      enum:    Object.values(DocumentStatus),
      default: DocumentStatus.UPLOADED,
      index:   true,
    },

    processingHistory: {
      type:    [ProcessingHistorySchema],
      default: [],
    },

    ocrText: {
      type:    String,
      default: '',
    },

    ocrConfidence: {
      type:    Number,
      default: 0,
    },

    metadata: {
      type:    DocumentMetadataSchema,
      default: {},
    },

    aiVersionInfo: {
      type:    AIVersionInfoSchema,
      default: null,
    },

    expiryDate: {
      type:    Date,
      default: null,
      index:   true,   // for expiry alert queries
    },

    errorMessage: {
      type:    String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound index: fetch all documents for a user, sorted by date
DocumentSchema.index({ userId: 1, createdAt: -1 });

// Text index on OCR text for full-text search
DocumentSchema.index({ ocrText: 'text' });

// Indexes for metadata search filtering
DocumentSchema.index({ 'metadata.holderName': 1 });
DocumentSchema.index({ 'metadata.documentName': 1 });
DocumentSchema.index({ 'metadata.organization': 1 });
DocumentSchema.index({ 'metadata.documentNumber': 1 });

// Indexes for category and status filtering
DocumentSchema.index({ category: 1 });
DocumentSchema.index({ mimeType: 1 });

// Compound index for efficient user + category + status searches
DocumentSchema.index({ userId: 1, category: 1, status: 1 });

export const DocumentModel: Model<IDocument> =
  mongoose.model<IDocument>('Document', DocumentSchema);
