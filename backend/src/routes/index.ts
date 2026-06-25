/**
 * routes/index.ts - API Router Entry Point
 *
 * Purpose: Central router that aggregates all feature routes.
 * All routes are prefixed with /api in app.ts.
 *
 * Planned Route Structure:
 *  /api/auth          → Authentication routes
 *  /api/users         → User management routes
 *  /api/documents     → Document CRUD routes
 *  /api/search        → Search routes
 *  /api/ocr           → OCR processing routes
 *
 * Design Decision:
 *  - Each feature has its own router in a separate file
 *  - This file combines them under the /api prefix
 *  - Makes it easy to add versioning later: /api/v1, /api/v2
 */

import { Router } from 'express';

// Feature routers will be imported here
// import { authRouter } from './auth.routes';
// import { userRouter } from './user.routes';
// import { documentRouter } from './document.routes';
// import { searchRouter } from './search.routes';
// import { ocrRouter } from './ocr.routes';

/**
 * Main API router that aggregates all feature routes.
 */
export const apiRouter = Router();

/**
 * Root API endpoint.
 * Provides basic info about the API.
 */
apiRouter.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'LifeVault API v1.0',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      documents: '/api/documents',
      search: '/api/search',
      ocr: '/api/ocr',
    },
    documentation: '/api/docs', // TODO: Add API documentation route
  });
});

/**
 * Feature routes will be mounted here:
 *
 * apiRouter.use('/auth', authRouter);
 * apiRouter.use('/users', userRouter);
 * apiRouter.use('/documents', documentRouter);
 * apiRouter.use('/search', searchRouter);
 * apiRouter.use('/ocr', ocrRouter);
 */

// TODO: Uncomment and implement feature routers in subsequent sprints
