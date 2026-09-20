/**
 * blockchain.controller.test.ts — Unit Tests for Blockchain Controller & B2 Integrity Verification
 */
import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import mongoose from 'mongoose';
import { verifyIntegrity, getIntegrityRecord } from '../../src/modules/blockchain/blockchain.controller';
import { DocumentModel } from '../../src/modules/document/document.model';
import { StorageFactory } from '../../src/common/storage.factory';
import { LocalStorageService } from '../../src/common/local-storage.service';
import { B2StorageService } from '../../src/common/b2-storage.service';
import { blockchainService } from '../../src/common/blockchain.service';

jest.mock('../../src/modules/document/document.model');
jest.mock('../../src/common/storage.factory');
jest.mock('../../src/common/blockchain.service');

const USER_A_ID = '64f3a1111111111111111111';
const USER_B_ID = '64f3a2222222222222222222';
const DOC_B2_ID = '64f3d1111111111111111111';
const DOC_LOCAL_ID = '64f3d2222222222222222222';

const testFileContent = Buffer.from('Original authentic LifeVault document bytes');
const testFileHash = createHash('sha256').update(testFileContent).digest('hex');

const mockB2Doc = {
  _id:              DOC_B2_ID,
  userId:           new mongoose.Types.ObjectId(USER_A_ID),
  originalFileName: 'b2_passport.pdf',
  storedFileName:   'uuid-b2.pdf',
  storagePath:      `${USER_A_ID}/2026/11112222-3333-4444-5555-666677778888.pdf`,
  storageProvider:  'b2' as const,
  mimeType:         'application/pdf',
  fileSize:         testFileContent.length,
  blockchainIntegrity: {
    fileHash:           testFileHash,
    verificationStatus: 'registered',
    txHash:             '0x1234567890abcdef',
    blockNumber:        123456,
  },
};

const mockLocalDoc = {
  _id:              DOC_LOCAL_ID,
  userId:           new mongoose.Types.ObjectId(USER_A_ID),
  originalFileName: 'local_license.pdf',
  storedFileName:   'uuid-local.pdf',
  storagePath:      `${USER_A_ID}/2026/22223333-4444-5555-6666-777788889999.pdf`,
  storageProvider:  'local' as const,
  mimeType:         'application/pdf',
  fileSize:         testFileContent.length,
  blockchainIntegrity: {
    fileHash:           testFileHash,
    verificationStatus: 'registered',
  },
};

describe('Blockchain Integrity Verification Controller (B2 + Local)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockB2Storage: { get: jest.Mock };
  let mockLocalStorage: { get: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    mockB2Storage = { get: jest.fn().mockResolvedValue(testFileContent) };
    mockLocalStorage = { get: jest.fn().mockResolvedValue(testFileContent) };

    (StorageFactory.getService as jest.Mock).mockImplementation((provider) => {
      if (provider === 'b2') return mockB2Storage;
      return mockLocalStorage;
    });

    (blockchainService.isEnabled as jest.Mock).mockReturnValue(false);

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json:   jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  it('1. Verify Integrity on a B2 document fetches from B2StorageService and confirms integrity', async () => {
    mockReq = {
      params: { id: DOC_B2_ID },
      user:   { sub: USER_A_ID } as any,
    };

    (DocumentModel.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockB2Doc),
    });
    (DocumentModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

    await verifyIntegrity(mockReq as Request, mockRes as Response, mockNext);

    expect(StorageFactory.getService).toHaveBeenCalledWith('b2');
    expect(mockB2Storage.get).toHaveBeenCalledWith(mockB2Doc.storagePath);
    expect(mockLocalStorage.get).not.toHaveBeenCalled();

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          verified:    true,
          currentHash: testFileHash,
        }),
      }),
    );
  });

  it('2. Verify Integrity on a legacy Local document fetches from LocalStorageService', async () => {
    mockReq = {
      params: { id: DOC_LOCAL_ID },
      user:   { sub: USER_A_ID } as any,
    };

    (DocumentModel.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockLocalDoc),
    });
    (DocumentModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

    await verifyIntegrity(mockReq as Request, mockRes as Response, mockNext);

    expect(StorageFactory.getService).toHaveBeenCalledWith('local');
    expect(mockLocalStorage.get).toHaveBeenCalledWith(mockLocalDoc.storagePath);
    expect(mockB2Storage.get).not.toHaveBeenCalled();

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          verified: true,
        }),
      }),
    );
  });

  it('3. B2 documents never attempt to read local filesystem when B2 retrieval succeeds', async () => {
    mockReq = {
      params: { id: DOC_B2_ID },
      user:   { sub: USER_A_ID } as any,
    };

    (DocumentModel.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockB2Doc),
    });

    await verifyIntegrity(mockReq as Request, mockRes as Response, mockNext);

    expect(mockB2Storage.get).toHaveBeenCalledTimes(1);
    expect(mockLocalStorage.get).toHaveBeenCalledTimes(0);
  });

  it('4. Rejects unauthorized user before accessing B2 storage', async () => {
    mockReq = {
      params: { id: DOC_B2_ID },
      user:   { sub: USER_B_ID } as any, // Different user
    };

    (DocumentModel.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockB2Doc),
    });

    await verifyIntegrity(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, message: 'Forbidden' }),
    );
    expect(mockB2Storage.get).not.toHaveBeenCalled();
    expect(mockLocalStorage.get).not.toHaveBeenCalled();
  });

  it('5. Detects tampered file when retrieved B2 bytes do not match registered hash', async () => {
    const tamperedBytes = Buffer.from('Altered / tampered file contents');
    mockB2Storage.get.mockResolvedValueOnce(tamperedBytes);

    mockReq = {
      params: { id: DOC_B2_ID },
      user:   { sub: USER_A_ID } as any,
    };

    (DocumentModel.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockB2Doc),
    });
    (DocumentModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

    await verifyIntegrity(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          verified: false,
        }),
      }),
    );
    expect(DocumentModel.findByIdAndUpdate).toHaveBeenCalledWith(
      DOC_B2_ID,
      { 'blockchainIntegrity.verificationStatus': 'tampered' },
    );
  });
});
