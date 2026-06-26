/**
 * modules/index.ts — API Router
 *
 * Aggregates all feature module routers under /api/v1.
 * Mounted in app.ts as: app.use('/api/v1', apiRouter)
 *
 * URL structure:
 *  /api/v1/auth/...         → auth module
 *  /api/v1/users/...        → user module
 *  /api/v1/documents/...    → document module  (Sprint 3)
 *  /api/v1/search/...       → search module    (Sprint 9)
 *  /api/v1/notifications/.. → notification     (Sprint 10)
 */
import { Router } from 'express';
import { authRouter } from './auth/auth.routes';
import { userRouter } from './user/user.routes';

export const apiRouter = Router();

/** API root — available endpoints */
apiRouter.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'LifeVault API v1',
    endpoints: {
      auth:          '/api/v1/auth',
      users:         '/api/v1/users',
      documents:     '/api/v1/documents',
      search:        '/api/v1/search',
      notifications: '/api/v1/notifications',
    },
    docs: '/api-docs',
  });
});

apiRouter.use('/auth',  authRouter);
apiRouter.use('/users', userRouter);

// Mounted in subsequent sprints:
// apiRouter.use('/documents',     documentRouter);
// apiRouter.use('/search',        searchRouter);
// apiRouter.use('/notifications', notificationRouter);
