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

/** Query params for GET /documents */
export const ListDocumentsSchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(50).default(10),
  category: z.string().optional(),
  status:   z.string().optional(),
});

export type ListDocumentsDto = z.infer<typeof ListDocumentsSchema>;
