/**
 * dashboard.service.test.ts — Unit Tests for DashboardService
 *
 * All external dependencies mocked:
 *  - DocumentModel
 *
 * Test matrix:
 *  A. getStats()            — total count, category/status aggregation, expired count, userId isolation
 *  B. getRecentDocuments()  — newest docs, limit enforcement, user isolation
 *  C. getExpiringDocuments()— future window enforcement, excludes past expired docs, user isolation
 *  D. getProcessingErrors() — failed status filtering, user isolation
 */
import mongoose from 'mongoose';
import { dashboardService } from '../../src/modules/document/dashboard.service';
import { DocumentModel } from '../../src/modules/document/document.model';
import { DocumentStatus } from '../../src/common/enums';

jest.mock('../../src/modules/document/document.model');

const USER_A_ID = '64f3a1111111111111111111';
const USER_B_ID = '64f3a2222222222222222222';
const DOC_1_ID  = '64f3d1111111111111111111';
const DOC_2_ID  = '64f3d2222222222222222222';

describe('DashboardService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ----------------------------------------------------------------
  // A. getStats()
  // ----------------------------------------------------------------
  describe('getStats()', () => {
    it('returns correct total count, category breakdown, status breakdown, and expired count', async () => {
      const mockFacetResult = [
        {
          total: [{ count: 12 }],
          byCategory: [
            { _id: 'Identity Card', count: 5 },
            { _id: 'Financial', count: 4 },
            { _id: 'Medical', count: 3 },
          ],
          byStatus: [
            { _id: 'READY', count: 10 },
            { _id: 'PROCESSING', count: 1 },
            { _id: 'FAILED', count: 1 },
          ],
          expired: [{ count: 2 }],
        },
      ];

      (DocumentModel.aggregate as jest.Mock).mockResolvedValue(mockFacetResult);

      const stats = await dashboardService.getStats(USER_A_ID);

      expect(stats.totalDocuments).toBe(12);
      expect(stats.expiredDocuments).toBe(2);
      expect(stats.byCategory).toEqual([
        { category: 'Identity Card', count: 5 },
        { category: 'Financial', count: 4 },
        { category: 'Medical', count: 3 },
      ]);
      expect(stats.byStatus).toEqual([
        { status: 'READY', count: 10 },
        { status: 'PROCESSING', count: 1 },
        { status: 'FAILED', count: 1 },
      ]);

      // Verify aggregation pipeline matches correct userId
      expect(DocumentModel.aggregate).toHaveBeenCalledTimes(1);
      const pipeline = (DocumentModel.aggregate as jest.Mock).mock.calls[0][0];
      expect(pipeline[0].$match.userId).toEqual(new mongoose.Types.ObjectId(USER_A_ID));
      expect(pipeline[1].$facet.expired).toBeDefined();
    });

    it('returns zeroed stats when aggregation yields no results', async () => {
      (DocumentModel.aggregate as jest.Mock).mockResolvedValue([]);

      const stats = await dashboardService.getStats(USER_B_ID);

      expect(stats).toEqual({
        totalDocuments: 0,
        byCategory: [],
        byStatus: [],
        expiredDocuments: 0,
      });
    });
  });

  // ----------------------------------------------------------------
  // B. getRecentDocuments()
  // ----------------------------------------------------------------
  describe('getRecentDocuments()', () => {
    it('returns newest documents respecting user isolation and limit', async () => {
      const mockRecentDocs = [
        {
          _id: new mongoose.Types.ObjectId(DOC_1_ID),
          originalFileName: 'passport.pdf',
          mimeType: 'application/pdf',
          fileSize: 102400,
          category: 'Identity Card',
          status: 'READY',
          createdAt: new Date('2026-09-18T10:00:00Z'),
        },
        {
          _id: new mongoose.Types.ObjectId(DOC_2_ID),
          originalFileName: 'invoice.pdf',
          mimeType: 'application/pdf',
          fileSize: 204800,
          category: 'Financial',
          status: 'READY',
          createdAt: new Date('2026-09-17T10:00:00Z'),
        },
      ];

      (DocumentModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockRecentDocs),
            }),
          }),
        }),
      });

      const docs = await dashboardService.getRecentDocuments(USER_A_ID, 5);

      expect(docs.length).toBe(2);
      expect(docs[0]._id).toBe(DOC_1_ID);
      expect(docs[0].originalFileName).toBe('passport.pdf');
      expect(DocumentModel.find).toHaveBeenCalledWith({
        userId: new mongoose.Types.ObjectId(USER_A_ID),
      });
    });
  });

  // ----------------------------------------------------------------
  // C. getExpiringDocuments()
  // ----------------------------------------------------------------
  describe('getExpiringDocuments()', () => {
    it('returns only documents inside the future window and filters by user', async () => {
      const mockExpiringDocs = [
        {
          _id: new mongoose.Types.ObjectId(DOC_1_ID),
          originalFileName: 'license.pdf',
          mimeType: 'application/pdf',
          fileSize: 50000,
          category: 'Identity Card',
          status: 'READY',
          createdAt: new Date('2026-09-01T10:00:00Z'),
        },
      ];

      (DocumentModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockExpiringDocs),
          }),
        }),
      });

      const docs = await dashboardService.getExpiringDocuments(USER_A_ID, 30);

      expect(docs.length).toBe(1);
      expect(docs[0]._id).toBe(DOC_1_ID);

      const findQuery = (DocumentModel.find as jest.Mock).mock.calls[0][0];
      expect(findQuery.userId).toEqual(new mongoose.Types.ObjectId(USER_A_ID));
      expect(findQuery.expiryDate.$gte).toBeInstanceOf(Date);
      expect(findQuery.expiryDate.$lte).toBeInstanceOf(Date);
      // Confirms future window: $gte is approx now and $lte is approx now + 30 days
      expect(findQuery.expiryDate.$lte.getTime()).toBeGreaterThan(findQuery.expiryDate.$gte.getTime());
    });
  });

  // ----------------------------------------------------------------
  // D. getProcessingErrors()
  // ----------------------------------------------------------------
  describe('getProcessingErrors()', () => {
    it('returns only failed documents for the authenticated user', async () => {
      const mockFailedDocs = [
        {
          _id: new mongoose.Types.ObjectId(DOC_2_ID),
          originalFileName: 'corrupted.pdf',
          mimeType: 'application/pdf',
          fileSize: 12000,
          category: 'Other',
          status: DocumentStatus.FAILED,
          createdAt: new Date('2026-09-19T10:00:00Z'),
        },
      ];

      (DocumentModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockFailedDocs),
          }),
        }),
      });

      const docs = await dashboardService.getProcessingErrors(USER_A_ID);

      expect(docs.length).toBe(1);
      expect(docs[0].status).toBe(DocumentStatus.FAILED);
      expect(DocumentModel.find).toHaveBeenCalledWith({
        userId: new mongoose.Types.ObjectId(USER_A_ID),
        status: DocumentStatus.FAILED,
      });
    });
  });
});
