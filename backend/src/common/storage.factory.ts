/**
 * storage.factory.ts — Storage Service Factory & Provider Selector
 *
 * Provides the appropriate IStorageService implementation:
 *  - LocalStorageService (when STORAGE_PROVIDER=local or fallback)
 *  - B2StorageService (when STORAGE_PROVIDER=b2)
 *
 * Supports per-document provider resolution so legacy documents stored on local disk
 * can be retrieved seamlessly alongside new documents uploaded to Backblaze B2.
 */
import { IStorageService } from './storage.interface';
import { LocalStorageService } from './local-storage.service';
import { B2StorageService } from './b2-storage.service';
import { appConfig } from '../config/app.config';
import { logger } from '../utils/logger';

export class StorageFactory {
  private static localInstance: LocalStorageService | null = null;
  private static b2Instance: B2StorageService | null = null;

  /** Get or create singleton LocalStorageService */
  static getLocalStorageService(): LocalStorageService {
    if (!this.localInstance) {
      this.localInstance = new LocalStorageService();
    }
    return this.localInstance;
  }

  /** Get or create singleton B2StorageService */
  static getB2StorageService(): B2StorageService {
    if (!this.b2Instance) {
      this.b2Instance = new B2StorageService();
    }
    return this.b2Instance;
  }

  /**
   * Returns the active storage service based on environment configuration or document override.
   *
   * @param providerOverride Explicit 'local' | 'b2' provider for document-specific retrieval
   */
  static getService(providerOverride?: 'local' | 'b2'): IStorageService {
    const target = providerOverride || appConfig.storageProvider;

    if (target === 'b2') {
      if (!appConfig.b2KeyId || !appConfig.b2ApplicationKey) {
        logger.warn('[STORAGE FACTORY] B2 credentials missing, falling back to LocalStorageService');
        return this.getLocalStorageService();
      }
      return this.getB2StorageService();
    }

    return this.getLocalStorageService();
  }
}

/** Default active storage service instance */
export const defaultStorageService: IStorageService = StorageFactory.getService();
