/**
 * b2-storage.service.ts — Backblaze B2 Cloud Storage (S3-Compatible)
 *
 * Implements IStorageService using Backblaze B2's S3-compatible API.
 * Uses @aws-sdk/client-s3 for private object storage.
 *
 * Object Key Layout:
 *   ${userId}/${year}/${storedFileName}
 *   e.g. 64f3a1.../2026/a3c7f2b1-326f-4c40-87f8-e2f68623cc6d.pdf
 *
 * Security:
 *  - Bucket is PRIVATE (zero public access).
 *  - No pre-signed public URLs are ever exposed.
 *  - All document requests are authenticated and authorized via Express backend.
 *  - All object keys are strictly validated against directory traversal and bucket escape.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { IStorageService, SavedFile } from './storage.interface';
import { appConfig } from '../config/app.config';
import { logger } from '../utils/logger';
import { validateObjectKey, isValidObjectKey } from '../utils/storage-key.util';

export class B2StorageService implements IStorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(clientOverride?: S3Client) {
    this.bucketName = appConfig.b2BucketName || 'lifevault-documents';

    if (clientOverride) {
      this.s3Client = clientOverride;
    } else {
      let endpoint = appConfig.b2Endpoint;
      if (endpoint && !endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
        endpoint = `https://${endpoint}`;
      }

      this.s3Client = new S3Client({
        endpoint: endpoint || undefined,
        region: appConfig.b2Region || 'us-east-005',
        credentials: {
          accessKeyId:     appConfig.b2KeyId || '',
          secretAccessKey: appConfig.b2ApplicationKey || '',
        },
      });
    }
  }

  /**
   * Saves an uploaded buffer to Backblaze B2 private bucket.
   *
   * @param buffer         File bytes in memory
   * @param storedFileName Unique filename (UUID + extension)
   * @param mimeType       MIME content type
   * @param subDir         Folder structure e.g. "userId/2026"
   */
  async save(
    buffer: Buffer,
    storedFileName: string,
    mimeType: string,
    subDir: string,
  ): Promise<SavedFile> {
    const objectKey = `${subDir}/${storedFileName}`.replace(/\\/g, '/');
    validateObjectKey(objectKey);

    const command = new PutObjectCommand({
      Bucket:      this.bucketName,
      Key:         objectKey,
      Body:        buffer,
      ContentType: mimeType,
    });

    await this.s3Client.send(command);

    logger.debug('[B2 STORAGE] File uploaded to B2 bucket', {
      bucket:    this.bucketName,
      objectKey,
      mimeType,
      sizeBytes: buffer.length,
    });

    return {
      storedName: storedFileName,
      path:       objectKey,
      sizeBytes:  buffer.length,
    };
  }

  /**
   * Retrieves file bytes from Backblaze B2 as a Buffer.
   *
   * @param storagePath Object key e.g. "userId/2026/uuid.pdf"
   */
  async get(storagePath: string): Promise<Buffer> {
    const objectKey = storagePath.replace(/\\/g, '/');
    validateObjectKey(objectKey);

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key:    objectKey,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error(`Empty response body received from B2 for object: ${objectKey}`);
      }

      // Transform stream / byte array to Node.js Buffer
      const byteArray = await (response.Body as any).transformToByteArray();
      return Buffer.from(byteArray);
    } catch (err: any) {
      logger.error('[B2 STORAGE] Failed to retrieve object from B2', {
        bucket: this.bucketName,
        objectKey,
        error: err.message,
      });
      throw new Error(`Physical document file not found in B2 storage: ${err.message}`);
    }
  }

  /**
   * Deletes an object from Backblaze B2 private bucket.
   *
   * @param storagePath Object key e.g. "userId/2026/uuid.pdf"
   */
  async delete(storagePath: string): Promise<void> {
    const objectKey = storagePath.replace(/\\/g, '/');
    validateObjectKey(objectKey);

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key:    objectKey,
    });

    await this.s3Client.send(command);
    logger.debug('[B2 STORAGE] Object deleted from B2 bucket', {
      bucket: this.bucketName,
      objectKey,
    });
  }

  /**
   * Checks whether an object exists in Backblaze B2.
   *
   * @param storagePath Object key e.g. "userId/2026/uuid.pdf"
   */
  async exists(storagePath: string): Promise<boolean> {
    const objectKey = storagePath.replace(/\\/g, '/');
    if (!isValidObjectKey(objectKey)) return false;

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key:    objectKey,
      });

      await this.s3Client.send(command);
      return true;
    } catch (err: any) {
      if (err.name === 'NotFound' || err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      logger.warn('[B2 STORAGE] HeadObject check failed', {
        bucket: this.bucketName,
        objectKey,
        error: err.message,
      });
      return false;
    }
  }
}
