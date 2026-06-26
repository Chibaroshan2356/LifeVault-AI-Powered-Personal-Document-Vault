/**
 * storage.interface.ts - File Storage Abstraction
 *
 * Why abstract storage?
 *  Currently LifeVault saves files to the local filesystem.
 *  In production you may want AWS S3, Google Cloud Storage, or Azure Blob.
 *  By depending on this interface — not on `fs` directly — swapping the
 *  implementation requires zero changes in the rest of the codebase.
 *
 * Implementations:
 *  LocalStorageService  — saves to /uploads  (development + Docker)
 *  S3StorageService     — saves to S3 bucket (production, Phase 2+)
 *
 * Usage (in document.service.ts):
 *   constructor(private storage: IStorageService) {}
 *   const path = await this.storage.save(file, userId);
 */

export interface SavedFile {
  /** The stored filename (e.g. UUID-based name on disk or S3 key) */
  storedName: string;
  /** Full path or URL to access the file */
  path: string;
  /** File size in bytes */
  sizeBytes: number;
}

export interface IStorageService {
  /**
   * Persist an uploaded file.
   * @param buffer  — file content
   * @param originalName — original filename from the upload
   * @param mimeType — MIME type of the file
   * @param userId  — owner's ID (used for folder organization)
   * @returns metadata about the saved file
   */
  save(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    userId: string,
  ): Promise<SavedFile>;

  /**
   * Retrieve a file as a buffer.
   * @param storedName — the stored filename / S3 key
   */
  get(storedName: string): Promise<Buffer>;

  /**
   * Delete a file permanently.
   * @param storedName — the stored filename / S3 key
   */
  delete(storedName: string): Promise<void>;

  /**
   * Check whether a file exists.
   */
  exists(storedName: string): Promise<boolean>;
}
