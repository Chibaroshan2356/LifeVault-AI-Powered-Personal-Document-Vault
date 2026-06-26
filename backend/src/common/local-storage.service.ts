/**
 * local-storage.service.ts - Local Filesystem Storage
 *
 * Implements IStorageService using the local /uploads directory.
 * Used in development and Docker Compose.
 *
 * File naming: {userId}/{uuid}.{ext}
 * Example: uploads/64f3a1.../a3c7f2b1-1234-5678-9abc-def012345678.pdf
 *
 * To switch to S3 in production:
 *  1. Create S3StorageService implementing IStorageService
 *  2. Swap the injection in the DI container — no other code changes needed
 */
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
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
    originalName: string,
    mimeType: string,
    userId: string,
  ): Promise<SavedFile> {
    // Create user-specific subdirectory
    const userDir = path.join(this.baseDir, userId);
    await fs.mkdir(userDir, { recursive: true });

    // Preserve original extension; use UUID for the filename
    const ext = path.extname(originalName).toLowerCase();
    const storedName = `${uuidv4()}${ext}`;
    const filePath = path.join(userDir, storedName);

    await fs.writeFile(filePath, buffer);
    logger.debug('File saved', { storedName, userId, mimeType, bytes: buffer.length });

    return {
      storedName,
      path: filePath,
      sizeBytes: buffer.length,
    };
  }

  async get(storedName: string): Promise<Buffer> {
    // storedName includes userId prefix: "userId/uuid.ext"
    const filePath = path.join(this.baseDir, storedName);
    return fs.readFile(filePath);
  }

  async delete(storedName: string): Promise<void> {
    const filePath = path.join(this.baseDir, storedName);
    await fs.unlink(filePath);
    logger.debug('File deleted', { storedName });
  }

  async exists(storedName: string): Promise<boolean> {
    try {
      const filePath = path.join(this.baseDir, storedName);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
