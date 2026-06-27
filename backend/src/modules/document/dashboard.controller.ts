/**
 * dashboard.controller.ts — Dashboard HTTP Controllers
 *
 * Thin layer: parse request → call service → return ApiResponse.
 * No business logic here.
 */
import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service';
import { ApiResponse } from '../../utils/ApiResponse';

// ------------------------------------------------------------------
// GET /api/v1/dashboard/stats
// ------------------------------------------------------------------

/**
 * @swagger
 * /dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats returned
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalDocuments: { type: integer }
 *                         byCategory:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               category: { type: string }
 *                               count: { type: integer }
 *                         byStatus:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               status: { type: string }
 *                               count: { type: integer }
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.sub;
    const stats = await dashboardService.getStats(userId);
    res.status(200).json(ApiResponse.success('Dashboard stats retrieved', stats));
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// GET /api/v1/dashboard/recent
// ------------------------------------------------------------------

/**
 * @swagger
 * /dashboard/recent:
 *   get:
 *     summary: Get recently uploaded documents
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: Maximum number of documents to return
 *     responses:
 *       200:
 *         description: Recent documents returned
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const getRecentDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.sub;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

    const documents = await dashboardService.getRecentDocuments(userId, limit);
    res
      .status(200)
      .json(
        ApiResponse.success('Recent documents retrieved', { documents }),
      );
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// GET /api/v1/dashboard/expiring
// ------------------------------------------------------------------

/**
 * @swagger
 * /dashboard/expiring:
 *   get:
 *     summary: Get documents expiring soon
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: daysWindow
 *         schema: { type: integer, default: 30 }
 *         description: Number of days to look ahead (max 365)
 *     responses:
 *       200:
 *         description: Expiring documents returned
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const getExpiringDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.sub;
    const daysWindow = Math.min(
      parseInt(req.query.daysWindow as string) || 30,
      365,
    );

    const documents = await dashboardService.getExpiringDocuments(
      userId,
      daysWindow,
    );
    res
      .status(200)
      .json(
        ApiResponse.success('Expiring documents retrieved', { documents }),
      );
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// GET /api/v1/dashboard/errors
// ------------------------------------------------------------------

/**
 * @swagger
 * /dashboard/errors:
 *   get:
 *     summary: Get documents with processing errors
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Documents with errors returned
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const getProcessingErrors = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.sub;
    const documents = await dashboardService.getProcessingErrors(userId);
    res
      .status(200)
      .json(
        ApiResponse.success('Processing errors retrieved', { documents }),
      );
  } catch (err) {
    next(err);
  }
};
