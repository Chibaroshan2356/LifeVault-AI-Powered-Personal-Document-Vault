/**
 * modules/index.ts - API Router
 *
 * Aggregates all feature module routers under /api/v1.
 * Each module owns its own routes, controller, service, and model.
 *
 * URL structure:
 *  /api/v1/auth/...         → auth module
 *  /api/v1/users/...        → user module
 *  /api/v1/documents/...    → document module
 *  /api/v1/search/...       → search module
 *  /api/v1/notifications/.. → notification module
 */
import { Router } from 'express';

// Feature routers — uncommented as each module is implemented
// import { authRouter }         from './auth/auth.routes';
// import { userRouter }         from './user/user.routes';
// import { documentRouter }     from './document/document.routes';
// import { searchRouter }       from './search/search.routes';
// import { notificationRouter } from './notification/notification.routes';

export const apiRouter = Router();

/** API root — returns available endpoints */
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
  });
});

// Mount feature routers here as they are implemented:
// apiRouter.use('/auth',          authRouter);
// apiRouter.use('/users',         userRouter);
// apiRouter.use('/documents',     documentRouter);
// apiRouter.use('/search',        searchRouter);
// apiRouter.use('/notifications', notificationRouter);
