/**
 * storage-key.util.ts — Object Key Security & Path Traversal Validator
 *
 * Validates object keys stored in database records and storage operations
 * to protect against path traversal, S3 bucket escape, and directory traversal.
 *
 * Expected structure:
 *  - User document:     `${24-hex-userId}/${4-digit-year}/${storedFileName}`
 *  - Training document: `training/${4-digit-year}/${storedFileName}`
 *
 * Example:
 *  64f3a1111111111111111111/2026/a3c7f2b1-326f-4c40-87f8-e2f68623cc6d.pdf
 */

/**
 * Validates an S3/B2 storage object key.
 * Returns true if valid, false if invalid/traversal detected.
 */
export function isValidObjectKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;

  // 1. Reject path traversal characters & absolute paths
  if (
    key.includes('..') ||
    key.includes('\\') ||
    key.startsWith('/') ||
    key.startsWith('\\') ||
    /^[a-zA-Z]:/.test(key)
  ) {
    return false;
  }

  // 2. Strict format check
  // Prefix: 24-hex MongoDB ObjectId OR 'training'
  // Middle: 4-digit year (1900-2099)
  // Filename: alphanumeric, hyphens, underscores, dots, ending in valid extension
  const objectKeyRegex = /^(?:[a-fA-F0-9]{24}|training)\/(?:19|20)\d{2}\/[a-zA-Z0-9_\-.]+\.[a-zA-Z0-9]+$/;

  return objectKeyRegex.test(key);
}

/**
 * Asserts that an object key is safe.
 * Throws an Error if invalid.
 */
export function validateObjectKey(key: string): string {
  if (!isValidObjectKey(key)) {
    throw new Error('Invalid storage path: Path traversal or malformed object key detected');
  }
  return key;
}
