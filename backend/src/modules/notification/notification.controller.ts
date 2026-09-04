import { Request, Response } from 'express';
import { notificationService } from './notification.service';
import { logger } from '../../utils/logger';

/** GET /api/v1/notifications */
export async function listNotifications(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

  try {
    const notifications = await notificationService.getNotificationsForUser(userId);
    const unreadCount   = await notificationService.getUnreadCount(userId);
    res.status(200).json({ success: true, data: { notifications, unreadCount } });
  } catch (err: any) {
    logger.error('listNotifications error', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/** PATCH /api/v1/notifications/:id/read */
export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  const { id } = req.params;
  if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

  try {
    await notificationService.markAsRead(id, userId);
    res.status(200).json({ success: true });
  } catch (err: any) {
    logger.error('markNotificationRead error', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/** PATCH /api/v1/notifications/read-all */
export async function markAllNotificationsRead(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

  try {
    await notificationService.markAllAsRead(userId);
    res.status(200).json({ success: true });
  } catch (err: any) {
    logger.error('markAllNotificationsRead error', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/** DELETE /api/v1/notifications/:id */
export async function deleteNotification(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  const { id } = req.params;
  if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

  try {
    const success = await notificationService.deleteNotification(id, userId);
    res.status(200).json({ success, message: success ? 'Notification deleted' : 'Notification not found' });
  } catch (err: any) {
    logger.error('deleteNotification error', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/** DELETE /api/v1/notifications (delete all) */
export async function deleteAllNotifications(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

  try {
    const count = await notificationService.deleteAllNotifications(userId);
    res.status(200).json({ success: true, message: `Deleted ${count} notifications` });
  } catch (err: any) {
    logger.error('deleteAllNotifications error', err);
    res.status(500).json({ success: false, message: err.message });
  }
}
