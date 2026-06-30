/**
 * dashboard.service.ts — Dashboard Business Logic
 *
 * Responsibilities:
 *  getStats()               → total docs, by category, by status (aggregation)
 *  getRecentDocuments()     → list of recent docs with limit
 *  getExpiringDocuments()   → docs expiring within N days
 *  getProcessingErrors()    → docs with FAILED status
 *
 * All methods use efficient MongoDB aggregation pipelines
 * and verify user ownership on aggregation filter stage.
 */
import mongoose from 'mongoose';
import { DocumentModel, IDocument } from './document.model';
import { DocumentStatus } from '../../common/enums';
import { logger } from '../../utils/logger';

/** Shape returned by getStats() */
export interface DashboardStats {
  totalDocuments: number;
  byCategory: Array<{ category: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
}

/** Shape of a document list item in dashboard */
export interface DashboardDocumentItem {
  _id: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  category: string;
  status: string;
  uploadedAt: Date;
}

class DashboardService {
  /**
   * Returns dashboard statistics for a user:
   * - Total document count
   * - Breakdown by category
   * - Breakdown by status
   *
   * Uses MongoDB aggregation for efficiency.
   */
  async getStats(userId: string): Promise<DashboardStats> {
    const userOid = new mongoose.Types.ObjectId(userId);

    // Aggregation pipeline: filter by user → count + group by category/status
    const pipeline: mongoose.PipelineStage[] = [
      // Stage 1: Filter by userId
      {
        $match: {
          userId: userOid,
        },
      } as mongoose.PipelineStage,

      // Stage 2: Count total documents and group by category and status
      {
        $facet: {
          total: [{ $count: 'count' }],
          byCategory: [
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ],
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ],
        },
      } as mongoose.PipelineStage,
    ];

    const result = await DocumentModel.aggregate<any>(pipeline);

    if (!result || result.length === 0) {
      return {
        totalDocuments: 0,
        byCategory: [],
        byStatus: [],
      };
    }

    const facetResult = result[0];

    return {
      totalDocuments: facetResult.total[0]?.count ?? 0,
      byCategory: facetResult.byCategory.map((item: any) => ({
        category: item._id,
        count: item.count,
      })),
      byStatus: facetResult.byStatus.map((item: any) => ({
        status: item._id,
        count: item.count,
      })),
    };
  }

  /**
   * Returns the most recently uploaded documents for a user.
   * @param userId — user's ObjectId
   * @param limit — max documents to return (default 10)
   */
  async getRecentDocuments(
    userId: string,
    limit: number = 10,
  ): Promise<DashboardDocumentItem[]> {
    const userOid = new mongoose.Types.ObjectId(userId);

    const docs = await DocumentModel
      .find({ userId: userOid })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select(
        '_id originalFileName mimeType fileSize category status createdAt',
      )
      .lean();

    return docs.map((doc: any) => ({
      _id: doc._id.toString(),
      originalFileName: doc.originalFileName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      category: doc.category,
      status: doc.status,
      uploadedAt: doc.createdAt,
    }));
  }

  /**
   * Returns documents expiring within a specified number of days.
   * Only returns documents with an expiryDate set.
   *
   * @param userId — user's ObjectId
   * @param daysWindow — number of days to look ahead (default 30)
   */
  async getExpiringDocuments(
    userId: string,
    daysWindow: number = 30,
  ): Promise<DashboardDocumentItem[]> {
    const userOid = new mongoose.Types.ObjectId(userId);

    // Calculate the date range: today to today + daysWindow
    const now = new Date();
    const windowEnd = new Date();
    windowEnd.setDate(windowEnd.getDate() + daysWindow);

    const docs = await DocumentModel
      .find({
        userId: userOid,
        expiryDate: {
          $gte: now,
          $lte: windowEnd,
        },
      })
      .sort({ expiryDate: 1 })
      .select(
        '_id originalFileName mimeType fileSize category status createdAt',
      )
      .lean();

    return docs.map((doc: any) => ({
      _id: doc._id.toString(),
      originalFileName: doc.originalFileName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      category: doc.category,
      status: doc.status,
      uploadedAt: doc.createdAt,
    }));
  }

  /**
   * Returns documents with FAILED status (processing errors).
   * These are documents that encountered errors during the AI pipeline.
   *
   * @param userId — user's ObjectId
   */
  async getProcessingErrors(userId: string): Promise<DashboardDocumentItem[]> {
    const userOid = new mongoose.Types.ObjectId(userId);

    const docs = await DocumentModel
      .find({
        userId: userOid,
        status: DocumentStatus.FAILED,
      })
      .sort({ updatedAt: -1 })
      .select(
        '_id originalFileName mimeType fileSize category status createdAt errorMessage',
      )
      .lean();

    return docs.map((doc: any) => ({
      _id: doc._id.toString(),
      originalFileName: doc.originalFileName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      category: doc.category,
      status: doc.status,
      uploadedAt: doc.createdAt,
    }));
  }
}

export const dashboardService = new DashboardService();
