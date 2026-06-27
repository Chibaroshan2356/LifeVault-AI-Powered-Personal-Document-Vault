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
    this.baseDir = appConfig.uploadDir;
  }

  async save(
    buffer: Buffer,
    storedFileName: string,
    mimeType: string,
    subDir: string,       // e.g. "userId/2026"
  ): Promise<SavedFile> {
    const dirPath  = path.join(this.baseDir, subDir);
    const filePath = path.join(dirPath, storedFileName);

    // Ensure the directory exists
    await fs.mkdir(dirPath, { recursive: true });

    await fs.writeFile(filePath, buffer);

    const storagePath = `${subDir}/${storedFileName}`;

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
    const filePath = path.join(this.baseDir, storagePath);
    return fs.readFile(filePath);
  }

  async delete(storagePath: string): Promise<void> {
    const filePath = path.join(this.baseDir, storagePath);
    await fs.unlink(filePath);
    logger.debug('File deleted from local storage', { storagePath });
  }

  async exists(storagePath: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.baseDir, storagePath));
      return true;
    } catch {
      return false;
    }
  }
}
