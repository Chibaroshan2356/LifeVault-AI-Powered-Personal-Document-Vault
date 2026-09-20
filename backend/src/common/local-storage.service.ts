/**
 * local-storage.service.ts — Local Filesystem Storage
 *
 * Implements IStorageService using the local /uploads directory.
 *
 * File layout:
 *   uploads/{subDir}/{storedFileName}
 *   e.g. uploads/64f3a1.../2026/a3c7f2b1.pdf
 *
 * The subDir is provided by the caller (DocumentService passes userId/year).
 * storagePath stored in MongoDB is the relative path: "userId/year/filename"
 *
 * To switch to S3 in production:
 *  1. Create S3StorageService implementing IStorageService
 *  2. Change the injection in document.service.ts — nothing else changes
 */
import fs from 'fs/promises';
import path from 'path';
import { IStorageService, SavedFile } from './storage.interface';
import { appConfig } from '../config/app.config';
import { logger } from '../utils/logger';

export class LocalStorageService implements IStorageService {
  private readonly baseDir: string;

  constructor() {
    this.baseDir = path.resolve(appConfig.uploadDir);
  }

  /**
   * Validates and resolves a storage path within the base uploads directory.
   * Throws an Error if directory traversal is attempted.
   */
  private resolveSafePath(storagePath: string): string {
    const resolvedBase = path.resolve(this.baseDir);
    const resolvedTarget = path.resolve(this.baseDir, storagePath);

    if (!resolvedTarget.startsWith(resolvedBase + path.sep) && resolvedTarget !== resolvedBase) {
      logger.warn('[SECURITY] Path traversal attempt detected and blocked', {
        storagePath,
        resolvedTarget,
        resolvedBase,
      });
      throw new Error('Invalid storage path: Path traversal detected');
    }

    return resolvedTarget;
  }

  async save(
    buffer: Buffer,
    storedFileName: string,
    mimeType: string,
    subDir: string,       // e.g. "userId/2026"
  ): Promise<SavedFile> {
    const safeSubDir = this.resolveSafePath(subDir);
    const filePath = this.resolveSafePath(path.join(subDir, storedFileName));

    // Ensure the directory exists
    await fs.mkdir(safeSubDir, { recursive: true });

    await fs.writeFile(filePath, buffer);

    const storagePath = `${subDir}/${storedFileName}`.replace(/\\/g, '/');

    logger.debug('File saved to local storage', {
      storagePath,
      mimeType,
      bytes: buffer.length,
    });

    return {
      storedName:  storedFileName,
      path:        filePath,
      sizeBytes:   buffer.length,
    };
  }

  async get(storagePath: string): Promise<Buffer> {
    const filePath = this.resolveSafePath(storagePath);
    return fs.readFile(filePath);
  }

  async delete(storagePath: string): Promise<void> {
    const filePath = this.resolveSafePath(storagePath);
    await fs.unlink(filePath);
    logger.debug('File deleted from local storage', { storagePath });
  }

  async exists(storagePath: string): Promise<boolean> {
    try {
      const filePath = this.resolveSafePath(storagePath);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

