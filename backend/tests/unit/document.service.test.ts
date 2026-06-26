/**
 * document.service.test.ts — Unit Tests for DocumentService
 *
 * All external dependencies mocked:
 *  - DocumentModel
 *  - LocalStorageService
 *  - jobQueue
 *
 * Test coverage:
 *  upload()     — success, storage failure
 *  findByUser() — returns paginated list
 *  findById()   — success, not found, forbidden
 *  deleteById() — success, not found, forbidden
 */
import { documentService } from '../../src/modules/document/document.service';
import { DocumentModel }   from '../../src/modules/document/document.model';
import { LocalStorageService } from '../../src/common/local-storage.service';
import { jobQueue }        from '../../src/common/job-queue.service';
import { HttpError }       from '../../src/middleware/error.middleware';

jest.mock('../../src/modules/document/document.model');
jest.mock('../../src/common/local-storage.service');
jest.mock('../../src/common/job-queue.service');

const OWNER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const DOC_ID   = 'cccccccccccccccccccccccc';

const mockFile = {
  originalname: 'passport.pdf',
  mimetype:     'application/pdf',
  size:         102400,
  buffer:       Buffer.from('fake pdf content'),
} as Express.Multer.File;

const mockDoc = {
  _id:             { toString: () => DOC_ID },
  userId:          { toString: () => OWNER_ID },
  originalFileName: 'passport.pdf',
  storagePath:     `${OWNER_ID}/2026/uuid.pdf`,
  status:          'UPLOADED',
};

// ----------------------------------------------------------------
// upload()
// ----------------------------------------------------------------
describe('DocumentService.upload()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('saves file, creates DB record, enqueues job, returns documentId', async () => {
    (LocalStorageService.prototype.save as jest.Mock).mockResolvedValue({ storedName: 'uuid.pdf', path: '/uploads/uuid.pdf', sizeBytes: 102400 });
    (DocumentModel.create as jest.Mock).mockResolvedValue({ _id: { toString: () => DOC_ID } });
    (jobQueue.enqueue as jest.Mock).mockResolvedValue(undefined);

    const result = await documentService.upload(mockFile, OWNER_ID);

    expect(result.documentId).toBe(DOC_ID);
    expect(LocalStorageService.prototype.save).toHaveBeenCalledTimes(1);
    expect(DocumentModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        originalFileName: 'passport.pdf',
        mimeType:         'application/pdf',
        fileSize:         102400,
        status:           'UPLOADED',
      }),
    );
    expect(jobQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: DOC_ID, userId: OWNER_ID }),
    );
  });

  it('throws if storage.save fails', async () => {
    (LocalStorageService.prototype.save as jest.Mock).mockRejectedValue(new Error('Disk full'));

    await expect(documentService.upload(mockFile, OWNER_ID))
      .rejects.toThrow('Disk full');
  });
});

// ----------------------------------------------------------------
// findByUser()
// ----------------------------------------------------------------
describe('DocumentService.findByUser()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paginated document list', async () => {
    (DocumentModel.countDocuments as jest.Mock).mockResolvedValue(1);
    const chainMock = {
      sort:   jest.fn().mockReturnThis(),
      skip:   jest.fn().mockReturnThis(),
      limit:  jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean:   jest.fn().mockResolvedValue([{ ...mockDoc, createdAt: new Date() }]),
    };
    (DocumentModel.find as jest.Mock).mockReturnValue(chainMock);

    const result = await documentService.findByUser(OWNER_ID, { page: 1, limit: 10 });

    expect(result.documents).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.page).toBe(1);
  });
});

// ----------------------------------------------------------------
// findById()
// ----------------------------------------------------------------
describe('DocumentService.findById()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns document when owner requests it', async () => {
    (DocumentModel.findById as jest.Mock).mockReturnValue({ lean: () => mockDoc });

    const result = await documentService.findById(DOC_ID, OWNER_ID);
    expect(result.originalFileName).toBe('passport.pdf');
  });

  it('throws 404 if document does not exist', async () => {
    (DocumentModel.findById as jest.Mock).mockReturnValue({ lean: () => null });

    await expect(documentService.findById(DOC_ID, OWNER_ID))
      .rejects.toThrow(new HttpError(404, 'Document not found'));
  });

  it('throws 403 if document belongs to another user', async () => {
    (DocumentModel.findById as jest.Mock).mockReturnValue({
      lean: () => ({ ...mockDoc, userId: { toString: () => OTHER_ID } }),
    });

    await expect(documentService.findById(DOC_ID, OWNER_ID))
      .rejects.toThrow(new HttpError(403, 'You do not have permission to access this document'));
  });
});

// ----------------------------------------------------------------
// deleteById()
// ----------------------------------------------------------------
describe('DocumentService.deleteById()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes file and DB record for the owner', async () => {
    (DocumentModel.findById as jest.Mock).mockResolvedValue(mockDoc);
    (LocalStorageService.prototype.delete as jest.Mock).mockResolvedValue(undefined);
    (DocumentModel.deleteOne as jest.Mock).mockResolvedValue({});

    await expect(documentService.deleteById(DOC_ID, OWNER_ID)).resolves.not.toThrow();
    expect(DocumentModel.deleteOne).toHaveBeenCalledWith({ _id: DOC_ID });
  });

  it('throws 404 if document does not exist', async () => {
    (DocumentModel.findById as jest.Mock).mockResolvedValue(null);

    await expect(documentService.deleteById(DOC_ID, OWNER_ID))
      .rejects.toThrow(new HttpError(404, 'Document not found'));
  });

  it('throws 403 if document belongs to another user', async () => {
    (DocumentModel.findById as jest.Mock).mockResolvedValue({
      ...mockDoc,
      userId: { toString: () => OTHER_ID },
    });

    await expect(documentService.deleteById(DOC_ID, OWNER_ID))
      .rejects.toThrow(new HttpError(403, 'You do not have permission to delete this document'));
  });

  it('does not fail if file is missing from storage during delete', async () => {
    (DocumentModel.findById as jest.Mock).mockResolvedValue(mockDoc);
    (LocalStorageService.prototype.delete as jest.Mock).mockRejectedValue(new Error('File not found'));
    (DocumentModel.deleteOne as jest.Mock).mockResolvedValue({});

    await expect(documentService.deleteById(DOC_ID, OWNER_ID)).resolves.not.toThrow();
  });
});
