/**
 * security-audit.service.ts — Security Audit & Suspicious Activity Detection Service
 *
 * Responsibilities:
 *  - Record all security events (logins, logouts, downloads, views, deletions, suspicious events)
 *  - Evaluate rule-based suspicious activity thresholds (failed logins, excessive downloads)
 *  - Trigger in-app notifications and email security alerts upon threshold breach
 *  - Provide paginated user security history (strictly isolated per authenticated user)
 */
import mongoose from 'mongoose';
import { SecurityAuditModel, ISecurityAudit } from './security-audit.model';
import { SecurityAction, SecurityStatus } from './security.types';
import { UserModel } from '../user/user.model';
import { NotificationModel } from '../notification/notification.model';
import { emailService } from '../../common/email.service';
import { appConfig } from '../../config/app.config';
import { logger } from '../../utils/logger';

export interface RecordEventParams {
  userId?:      string;
  documentId?:  string;
  action:       SecurityAction;
  status?:      SecurityStatus;
  ipAddress?:   string;
  userAgent?:   string;
  details?:     string;
}

export interface SecurityActivityItem {
  id:         string;
  action:     SecurityAction;
  status:     SecurityStatus;
  ipAddress?: string;
  userAgent?: string;
  details?:   string;
  timestamp:  Date;
  documentId?: string;
}

class SecurityAuditService {
  /**
   * Records a security event in the database.
   * Safe & non-blocking — catches internal errors to prevent interrupting user actions.
   */
  async recordEvent(params: RecordEventParams): Promise<ISecurityAudit | null> {
    try {
      const doc = await SecurityAuditModel.create({
        userId:     params.userId ? new mongoose.Types.ObjectId(params.userId) : undefined,
        documentId: params.documentId ? new mongoose.Types.ObjectId(params.documentId) : undefined,
        action:     params.action,
        status:     params.status || SecurityStatus.SUCCESS,
        ipAddress:  params.ipAddress,
        userAgent:  params.userAgent ? params.userAgent.slice(0, 300) : undefined,
        details:    params.details ? params.details.slice(0, 500) : undefined,
      });

      logger.info(`[SECURITY AUDIT] ${params.action} (${params.status || SecurityStatus.SUCCESS})`, {
        userId:     params.userId,
        documentId: params.documentId,
        ip:         params.ipAddress,
      });

      return doc;
    } catch (err: any) {
      logger.error('[SECURITY AUDIT] Failed to persist audit event', {
        action: params.action,
        error:  err.message,
      });
      return null;
    }
  }

  /**
   * Retrieves paginated security activity log for the authenticated user only.
   */
  async getUserActivity(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ events: SecurityActivityItem[]; total: number; totalPages: number }> {
    const filter = { userId: new mongoose.Types.ObjectId(userId) };
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      SecurityAuditModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SecurityAuditModel.countDocuments(filter),
    ]);

    const events: SecurityActivityItem[] = docs.map((d) => ({
      id:         (d._id as mongoose.Types.ObjectId).toString(),
      action:     d.action,
      status:     d.status,
      ipAddress:  d.ipAddress,
      userAgent:  d.userAgent,
      details:    d.details,
      timestamp:  d.createdAt,
      documentId: d.documentId ? d.documentId.toString() : undefined,
    }));

    return {
      events,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Evaluates failed login attempts within the configured window.
   * If threshold is exceeded, registers a suspicious activity event,
   * creates an in-app security alert, and dispatches an email alert.
   */
  async checkSuspiciousFailedLogins(
    ipAddress?: string,
    email?:     string,
  ): Promise<boolean> {
    const windowMs = appConfig.failedLoginWindowMinutes * 60 * 1000;
    const since = new Date(Date.now() - windowMs);

    // Build filter based on IP and/or failed logins
    const filter: Record<string, unknown> = {
      action:    SecurityAction.LOGIN_FAILED,
      createdAt: { $gte: since },
    };
    if (ipAddress) {
      filter.ipAddress = ipAddress;
    }

    const failedCount = await SecurityAuditModel.countDocuments(filter);

    if (failedCount >= appConfig.failedLoginThreshold) {
      const description = `${failedCount} failed login attempts detected in the last ${appConfig.failedLoginWindowMinutes} minutes from IP ${ipAddress || 'unknown'}.`;
      
      logger.warn(`[SUSPICIOUS ACTIVITY] Failed login threshold breached (${failedCount} attempts)`, {
        ipAddress,
        email,
      });

      let user = null;
      if (email) {
        user = await UserModel.findOne({ email: email.toLowerCase() });
      }

      const userId = user ? (user._id as mongoose.Types.ObjectId).toString() : undefined;

      // 1. Record suspicious activity audit event
      await this.recordEvent({
        userId,
        action:    SecurityAction.SUSPICIOUS_ACTIVITY,
        status:    SecurityStatus.FAILED,
        ipAddress,
        details:   description,
      });

      // 2. If an account is associated with this email, create in-app notification & send email
      if (user) {
        // 2a. In-App Notification (independent)
        try {
          await NotificationModel.create({
            userId:    user._id,
            title:     '⚠️ Suspicious Login Activity',
            body:      `We detected ${failedCount} failed login attempts on your account. If this was not you, consider resetting your password.`,
            eventType: 'security',
            subtitle:  'Security Alert',
          });
        } catch (notifErr: any) {
          logger.error('[SUSPICIOUS ACTIVITY] Failed to create in-app notification for failed logins', {
            error: notifErr.message,
            userId,
          });
        }

        // 2b. Email Security Alert (independent)
        try {
          await emailService.sendSuspiciousActivityEmail(
            user.email,
            user.fullName,
            description,
          );
        } catch (emailErr: any) {
          logger.error('[SUSPICIOUS ACTIVITY] Failed to dispatch suspicious login email', {
            error: emailErr.message,
            userId,
          });
        }
      }

      return true;
    }

    return false;
  }

  /**
   * Evaluates excessive document downloads within the configured window.
   * If threshold is exceeded, registers a suspicious activity event,
   * creates an in-app security alert, and dispatches an email alert.
   */
  async checkSuspiciousDownloads(userId: string): Promise<boolean> {
    const windowMs = appConfig.downloadWindowMinutes * 60 * 1000;
    const since = new Date(Date.now() - windowMs);

    const downloadCount = await SecurityAuditModel.countDocuments({
      userId:    new mongoose.Types.ObjectId(userId),
      action:    SecurityAction.DOCUMENT_DOWNLOAD,
      status:    SecurityStatus.SUCCESS,
      createdAt: { $gte: since },
    });

    if (downloadCount >= appConfig.downloadThreshold) {
      const description = `High document download volume: ${downloadCount} downloads in ${appConfig.downloadWindowMinutes} minutes.`;

      logger.warn(`[SUSPICIOUS ACTIVITY] Document download threshold breached for user ${userId} (${downloadCount} downloads)`);

      // 1. Record suspicious event
      await this.recordEvent({
        userId,
        action:  SecurityAction.SUSPICIOUS_ACTIVITY,
        status:  SecurityStatus.SUCCESS,
        details: description,
      });

      // 2. Alert user via notification and email (independent operations)
      try {
        const user = await UserModel.findById(userId);
        if (user) {
          // 2a. In-App Notification (independent)
          try {
            await NotificationModel.create({
              userId:    user._id,
              title:     '⚠️ Unusual Download Volume Detected',
              body:      `Your account has downloaded ${downloadCount} documents in the last ${appConfig.downloadWindowMinutes} minutes.`,
              eventType: 'security',
              subtitle:  'Theft Protection Alert',
            });
          } catch (notifErr: any) {
            logger.error('[SUSPICIOUS ACTIVITY] Failed to create in-app download alert notification', {
              error: notifErr.message,
              userId,
            });
          }

          // 2b. Email Security Alert (independent — always attempted)
          try {
            await emailService.sendSuspiciousActivityEmail(
              user.email,
              user.fullName,
              description,
            );
          } catch (emailErr: any) {
            logger.error('[SUSPICIOUS ACTIVITY] Failed to dispatch download anomaly email', {
              error: emailErr.message,
              userId,
            });
          }
        }
      } catch (err: any) {
        logger.error('[SUSPICIOUS ACTIVITY] Error resolving user for download anomaly alert', { error: err.message });
      }

      return true;
    }

    return false;
  }
}

export const securityAuditService = new SecurityAuditService();
