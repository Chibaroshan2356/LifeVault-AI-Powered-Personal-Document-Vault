/**
 * document.validator.ts — Zod Request Schemas for Document Module
 *
 * File validation is handled by Multer middleware (MIME type + size).
 * Zod handles any JSON body fields on document endpoints.
 */
import { z } from 'zod';

/** Supported MIME types — validated by Multer, referenced here for consistency */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
] as const;

export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];

/** Query params for GET /documents (list + filters) */
export const ListDocumentsSchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(50).default(10),
  category: z.string().optional(),
  status:   z.string().optional(),
});

export type ListDocumentsDto = z.infer<typeof ListDocumentsSchema>;

/** Query params for GET /documents/search (full-text + metadata search) */
export const SearchDocumentsSchema = z.object({
  // Pagination
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(50).default(10),

  // Search queries
  q:        z.string().min(1).optional(),              // full-text OCR search
  holder:   z.string().optional(),                     // metadata.holderName search
  docname:  z.string().optional(),                     // metadata.documentName search
  org:      z.string().optional(),                     // metadata.organization search
  docnumber: z.string().optional(),                    // metadata.documentNumber search

  // Filters
  category: z.string().optional(),                     // document type filter
  status:   z.string().optional(),                     // processing status filter
  mimeType: z.string().optional(),                     // file type filter
  minSize:  z.coerce.number().int().min(0).optional(), // file size range (bytes)
  maxSize:  z.coerce.number().int().min(0).optional(),

  // Date range filter
  fromDate: z.string().datetime().optional(),          // ISO 8601 format
  toDate:   z.string().datetime().optional(),

  // Sorting
  sort:     z.enum(['newest', 'oldest', 'name', 'size']).default('newest'),
});

export type SearchDocumentsDto = z.infer<typeof SearchDocumentsSchema>;
