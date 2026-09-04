import { Router }      from 'express';
import { authenticate } from '../../middleware/authenticate.middleware';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
} from './notification.controller';

export const notificationRouter = Router();

notificationRouter.use(authenticate);

notificationRouter.get(   '/',              listNotifications);
notificationRouter.patch( '/read-all',      markAllNotificationsRead);
notificationRouter.patch( '/:id/read',      markNotificationRead);
notificationRouter.delete('/clear-all',     deleteAllNotifications);
notificationRouter.delete('/',              deleteAllNotifications);
notificationRouter.delete('/:id',           deleteNotification);
