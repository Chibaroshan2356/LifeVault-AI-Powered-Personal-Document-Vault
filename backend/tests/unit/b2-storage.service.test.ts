/**
 * b2-storage.service.test.ts — Unit Tests for B2StorageService & Object Key Security
 */
import { B2StorageService } from '../../src/common/b2-storage.service';
import { StorageFactory } from '../../src/common/storage.factory';
import { LocalStorageService } from '../../src/common/local-storage.service';
import { isValidObjectKey, validateObjectKey } from '../../src/utils/storage-key.util';
import { appConfig } from '../../src/config/app.config';
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

describe('B2StorageService & Cloud Storage Security', () => {
  const mockSend = jest.fn();
  const mockS3Client = { send: mockSend } as any;
  let b2Storage: B2StorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    b2Storage = new B2StorageService(mockS3Client);
  });

  describe('save()', () => {
    it('sends PutObjectCommand with correct bucket, key, buffer, and content-type', async () => {
      mockSend.mockResolvedValueOnce({});

      const buffer = Buffer.from('test pdf content');
      const storedName = '11112222-3333-4444-5555-666677778888.pdf';
      const subDir = '64f3a1111111111111111111/2026';

      const result = await b2Storage.save(buffer, storedName, 'application/pdf', subDir);

      expect(result).toEqual({
        storedName,
        path: `${subDir}/${storedName}`,
        sizeBytes: buffer.length,
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input).toMatchObject({
        Bucket:      'lifevault-documents',
        Key:         `${subDir}/${storedName}`,
        Body:        buffer,
        ContentType: 'application/pdf',
      });
    });

    it('rejects saving with a path traversal subDir', async () => {
      const buffer = Buffer.from('malicious');
      await expect(
        b2Storage.save(buffer, 'test.pdf', 'application/pdf', '../../etc'),
      ).rejects.toThrow('Path traversal or malformed object key detected');

      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('get()', () => {
    it('retrieves object and transforms byte array to Buffer', async () => {
      const fakeBytes = new Uint8Array(Buffer.from('retrieved content'));
      mockSend.mockResolvedValueOnce({
        Body: {
          transformToByteArray: jest.fn().mockResolvedValue(fakeBytes),
        },
      });

      const key = '64f3a1111111111111111111/2026/11112222-3333-4444-5555-666677778888.pdf';
      const buffer = await b2Storage.get(key);

      expect(buffer.toString()).toBe('retrieved content');
      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(command.input).toMatchObject({
        Bucket: 'lifevault-documents',
        Key:    key,
      });
    });

    it('throws clean error when B2 GetObject fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('NoSuchKey: The specified key does not exist'));

      const key = '64f3a1111111111111111111/2026/11112222-3333-4444-5555-666677778888.pdf';
      await expect(b2Storage.get(key)).rejects.toThrow(
        'Physical document file not found in B2 storage',
      );
    });

    it('rejects get() with traversal path', async () => {
      await expect(b2Storage.get('../../../../etc/passwd')).rejects.toThrow(
        'Path traversal or malformed object key detected',
      );
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('delete()', () => {
    it('sends DeleteObjectCommand with correct key', async () => {
      mockSend.mockResolvedValueOnce({});

      const key = '64f3a1111111111111111111/2026/11112222-3333-4444-5555-666677778888.pdf';
      await b2Storage.delete(key);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(DeleteObjectCommand);
      expect(command.input).toMatchObject({
        Bucket: 'lifevault-documents',
        Key:    key,
      });
    });
  });

  describe('exists()', () => {
    it('returns true when HeadObject succeeds', async () => {
      mockSend.mockResolvedValueOnce({});

      const key = '64f3a1111111111111111111/2026/11112222-3333-4444-5555-666677778888.pdf';
      const result = await b2Storage.exists(key);

      expect(result).toBe(true);
      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(HeadObjectCommand);
      expect(command.input).toMatchObject({
        Bucket: 'lifevault-documents',
        Key:    key,
      });
    });

    it('returns false when HeadObject throws NotFound / 404 without crashing', async () => {
      const notFoundErr: any = new Error('NotFound');
      notFoundErr.name = 'NotFound';
      mockSend.mockRejectedValueOnce(notFoundErr);

      const key = '64f3a1111111111111111111/2026/11112222-3333-4444-5555-666677778888.pdf';
      const result = await b2Storage.exists(key);

      expect(result).toBe(false);
    });

    it('returns false immediately for invalid traversal key', async () => {
      const result = await b2Storage.exists('../../secret');
      expect(result).toBe(false);
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('Object Key Security & Traversal Validation', () => {
    it('accepts valid user document keys', () => {
      expect(isValidObjectKey('64f3a1111111111111111111/2026/12345678-1234-1234-1234-123456789abc.pdf')).toBe(true);
      expect(isValidObjectKey('64f3a2222222222222222222/2025/photo_01.jpg')).toBe(true);
    });

    it('accepts valid training document keys', () => {
      expect(isValidObjectKey('training/2026/sample-id-card.png')).toBe(true);
    });

    it('rejects relative path traversal patterns (.. , ../ , ../../)', () => {
      expect(isValidObjectKey('../secret.pdf')).toBe(false);
      expect(isValidObjectKey('../../secret.pdf')).toBe(false);
      expect(isValidObjectKey('64f3a1111111111111111111/2026/../../../etc/passwd')).toBe(false);
    });

    it('rejects absolute paths and drive letters', () => {
      expect(isValidObjectKey('/etc/passwd')).toBe(false);
      expect(isValidObjectKey('C:\\Windows\\system32')).toBe(false);
      expect(isValidObjectKey('C:/uploads/file.pdf')).toBe(false);
    });

    it('rejects backslashes', () => {
      expect(isValidObjectKey('64f3a1111111111111111111\\2026\\uuid.pdf')).toBe(false);
    });

    it('rejects invalid user IDs or malformed year structures', () => {
      expect(isValidObjectKey('invalid-user/2026/uuid.pdf')).toBe(false);
      expect(isValidObjectKey('64f3a1111111111111111111/999/uuid.pdf')).toBe(false);
      expect(isValidObjectKey('64f3a1111111111111111111/2026/')).toBe(false);
    });

    it('validateObjectKey() throws on invalid keys and passes valid keys', () => {
      expect(() => validateObjectKey('../../etc/passwd')).toThrow('Path traversal or malformed object key detected');
      expect(validateObjectKey('64f3a1111111111111111111/2026/valid.pdf')).toBe('64f3a1111111111111111111/2026/valid.pdf');
    });
  });

  describe('StorageFactory Provider Selection', () => {
    const originalProvider = appConfig.storageProvider;
    const originalKey = appConfig.b2KeyId;
    const originalSecret = appConfig.b2ApplicationKey;

    afterEach(() => {
      (appConfig as any).storageProvider = originalProvider;
      (appConfig as any).b2KeyId = originalKey;
      (appConfig as any).b2ApplicationKey = originalSecret;
    });

    it('returns LocalStorageService when STORAGE_PROVIDER=local', () => {
      (appConfig as any).storageProvider = 'local';
      const service = StorageFactory.getService();
      expect(service).toBeInstanceOf(LocalStorageService);
    });

    it('returns B2StorageService when STORAGE_PROVIDER=b2 and credentials exist', () => {
      (appConfig as any).storageProvider = 'b2';
      (appConfig as any).b2KeyId = 'mock-key-id';
      (appConfig as any).b2ApplicationKey = 'mock-app-key';
      const service = StorageFactory.getService();
      expect(service).toBeInstanceOf(B2StorageService);
    });

    it('falls back to LocalStorageService when STORAGE_PROVIDER=b2 but credentials are empty', () => {
      (appConfig as any).storageProvider = 'b2';
      (appConfig as any).b2KeyId = '';
      (appConfig as any).b2ApplicationKey = '';
      const service = StorageFactory.getService();
      expect(service).toBeInstanceOf(LocalStorageService);
    });

    it('supports explicit provider override per document', () => {
      const localService = StorageFactory.getService('local');
      expect(localService).toBeInstanceOf(LocalStorageService);
    });
  });
});
