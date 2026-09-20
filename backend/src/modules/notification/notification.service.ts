import mongoose from 'mongoose';
import { NotificationModel, INotification } from './notification.model';

export class NotificationService {

  async createNotification(
    userId:     string,
    documentId: string,
    title:      string,
    body:       string,
    eventType?: string,
    docName?:   string,
    subtitle?:  string,
  ): Promise<INotification> {
    return NotificationModel.create({
      userId:     new mongoose.Types.ObjectId(userId),
      documentId: new mongoose.Types.ObjectId(documentId),
      title,
      body,
      eventType:  eventType || 'reminder',
      docName:    docName || '',
      subtitle:   subtitle || '',
    });
  }

  async getNotificationsForUser(userId: string): Promise<INotification[]> {
    return NotificationModel
      .find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(50);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return NotificationModel.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      read:   false,
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await NotificationModel.findOneAndUpdate(
      { _id: notificationId, userId: new mongoose.Types.ObjectId(userId) },
      { $set: { read: true } },
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await NotificationModel.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), read: false },
      { $set: { read: true } },
    );
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const res = await NotificationModel.findOneAndDelete({
      _id: notificationId,
      userId: new mongoose.Types.ObjectId(userId),
    });
    return !!res;
  }

  async deleteAllNotifications(userId: string): Promise<number> {
    const res = await NotificationModel.deleteMany({
      userId: new mongoose.Types.ObjectId(userId),
    });
    return res.deletedCount || 0;
  }
}

export const notificationService = new NotificationService();
