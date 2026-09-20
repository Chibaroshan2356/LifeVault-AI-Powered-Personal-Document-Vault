/**
 * modules/index.ts — API Router
 *
 * Aggregates all feature module routers under /api/v1.
 * Mounted in app.ts as: app.use('/api/v1', apiRouter)
 */
import { Router } from 'express';
import { authRouter }         from './auth/auth.routes';
import { userRouter }         from './user/user.routes';
import { documentRouter }     from './document/document.routes';
import { dashboardRouter }    from './document/dashboard.routes';
import { smartFolderRouter }  from './smart-folder/smart-folder.routes';
import { reminderRouter }     from './reminder/reminder.routes';
import { notificationRouter } from './notification/notification.routes';
import { blockchainRouter }   from './blockchain/blockchain.routes';
import { securityRouter }     from './security/security.routes';

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
      dashboard:     '/api/v1/dashboard',
      search:        '/api/v1/search',
      smartFolders:  '/api/v1/smart-folders',
      reminders:     '/api/v1/reminders',
      notifications: '/api/v1/notifications',
      security:      '/api/v1/security',
    },
    docs: '/api-docs',
  });
});

apiRouter.use('/auth',          authRouter);
apiRouter.use('/users',         userRouter);
apiRouter.use('/documents',     documentRouter);
// Blockchain integrity routes nested under document ID
apiRouter.use('/documents/:id', blockchainRouter);
apiRouter.use('/dashboard',     dashboardRouter);
apiRouter.use('/smart-folders', smartFolderRouter);
apiRouter.use('/reminders',     reminderRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/security',      securityRouter);

