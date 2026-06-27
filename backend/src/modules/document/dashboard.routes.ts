/**
 * dashboard.routes.ts — Dashboard Route Definitions
 *
 * All routes under /api/v1/dashboard (mounted in modules/index.ts).
 * All routes require authentication.
 */

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard statistics and quick views
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.middleware';
import {
  getDashboardStats,
  getRecentDocuments,
  getExpiringDocuments,
  getProcessingErrors,
} from './dashboard.controller';

export const dashboardRouter = Router();

// All dashboard routes require a valid JWT
dashboardRouter.use(authenticate);

// Routes
dashboardRouter.get('/stats', getDashboardStats);
dashboardRouter.get('/recent', getRecentDocuments);
dashboardRouter.get('/expiring', getExpiringDocuments);
dashboardRouter.get('/errors', getProcessingErrors);
