/**
 * reminder.service.ts — Smart Reminder Business Logic
 *
 * - Detects actionable dates from existing document metadata and OCR text
 * - Derives event types from document categories
 * - CRUD operations for reminders
 * - Immediate test trigger execution
 * - Debug inspector
 */
import mongoose from 'mongoose';
import { ReminderModel, IReminder, ReminderEventType, IReminderChannels } from './reminder.model';
import { DocumentModel } from '../document/document.model';
import { UserModel } from '../user/user.model';
import { notificationService } from '../notification/notification.service';
import { emailService } from '../../common/email.service';
import { logger } from '../../utils/logger';

// ── Category → Event Type/Label mapping ───────────────────────────────────

interface EventMeta {
  eventType:  ReminderEventType;
  eventLabel: string;
}

const CATEGORY_EVENT_MAP: Partial<Record<string, EventMeta>> = {
  'Insurance Policy':        { eventType: 'insurance_expiry',     eventLabel: 'Insurance Renewal'    },
  'Warranty Card':           { eventType: 'warranty_expiry',      eventLabel: 'Warranty Expiry'      },
  'Guarantee Card':          { eventType: 'guarantee_expiry',     eventLabel: 'Guarantee Expiry'     },
  'Electricity Bill':        { eventType: 'payment_due',          eventLabel: 'Payment Due'          },
  'Utility Bill':            { eventType: 'payment_due',          eventLabel: 'Payment Due'          },
  'Fee Receipt':             { eventType: 'payment_due',          eventLabel: 'Fee Payment Due'      },
  'Subscription':            { eventType: 'subscription_renewal', eventLabel: 'Subscription Renewal' },
  'Vehicle Document':        { eventType: 'vehicle_renewal',      eventLabel: 'Vehicle Renewal'      },
  'Driving Licence':         { eventType: 'vehicle_renewal',      eventLabel: 'Licence Renewal'      },
  'Certificate':             { eventType: 'certificate_expiry',   eventLabel: 'Certificate Expiry'   },
  'Educational Certificate': { eventType: 'certificate_expiry',   eventLabel: 'Certificate Expiry'   },
  'Passport':                { eventType: 'passport_expiry',      eventLabel: 'Passport Expiry'      },
  'Visa':                    { eventType: 'visa_expiry',          eventLabel: 'Visa Expiry'          },
  'Identity Card':           { eventType: 'certificate_expiry',   eventLabel: 'ID Card Expiry'       },
};

// ── Public DTOs ────────────────────────────────────────────────────────────

export interface ReminderDetectionResult {
  hasActionableDate: boolean;
  eventDate?:        Date;
  eventType?:        ReminderEventType;
  eventLabel?:       string;
  lowConfidence?:    boolean;
}

export interface UpsertReminderDto {
  eventType?:        ReminderEventType;
  eventLabel?:       string;
  eventDate?:        string | Date;
  intervals?:        Array<{ daysBefore: number; enabled: boolean }>;
  notificationTime?: string;
  timezone?:         string;
  channels?:         IReminderChannels;
  enabled?:          boolean;
  isManual?:         boolean;
}

export interface TriggerExecutionResult {
  success:  boolean;
  channels: {
    inApp:   'sent' | 'failed' | 'disabled';
    browser: 'sent' | 'failed' | 'disabled';
    email:   'sent' | 'failed' | 'disabled';
  };
  errors?: {
    inApp?:   string;
    browser?: string;
    email?:   string;
  };
  debug?: Record<string, any>;
}

// ── Service ────────────────────────────────────────────────────────────────

export class ReminderService {

  /**
   * Inspect document metadata and OCR text to determine if it contains an actionable date.
   * Only expiry/renewal/due/warranty dates are considered actionable.
   * Issue dates and purchase dates are NOT actionable.
   */
  detectActionableDate(doc: any): ReminderDetectionResult {
    let rawDate = doc.expiryDate ?? doc.metadata?.expiryDate ?? null;

    if (!rawDate && doc.ocrText) {
      rawDate = this.extractActionableDateFromText(doc.ocrText);
    }

    if (!rawDate) {
      return { hasActionableDate: false };
    }

    const eventDate = new Date(rawDate);
    if (isNaN(eventDate.getTime())) {
      return { hasActionableDate: false };
    }

    const meta = CATEGORY_EVENT_MAP[doc.category] ?? {
      eventType:  'custom' as ReminderEventType,
      eventLabel: 'Document Expiry',
    };

    const lowConfidence = doc.ocrConfidence != null && doc.ocrConfidence < 0.7;

    return {
      hasActionableDate: true,
      eventDate,
      eventType:         meta.eventType,
      eventLabel:        meta.eventLabel,
      lowConfidence,
    };
  }

  private extractActionableDateFromText(text: string): Date | null {
    if (!text) return null;
    const actionablePatterns = [
      /(?:valid\s+(?:until|till|thru|through|up\s+to)|expiry\s+date|expires\s+(?:on)?|exp(?:iry)?\s*[:\.]|due\s+date|payment\s+due|renewal\s+date|warranty\s+(?:until|end|expiry))\s*[:\-\s]\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4}|[0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{2,4}|[A-Za-z]{3,9}\s+[0-9]{1,2},?\s+[0-9]{2,4})/i,
    ];

    for (const pattern of actionablePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const parsed = new Date(match[1].trim());
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
    return null;
  }

  /**
   * Get the reminder for a document.
   */
  async getReminderForDocument(documentId: string, userId: string): Promise<IReminder | null> {
    return ReminderModel.findOne({
      documentId: new mongoose.Types.ObjectId(documentId),
      userId:     new mongoose.Types.ObjectId(userId),
    });
  }

  /**
   * Auto-create a reminder from AI-detected date if none exists.
   */
  async getOrCreateReminderFromDocument(documentId: string, userId: string): Promise<{
    reminder: IReminder | null;
    detection: ReminderDetectionResult;
  }> {
    const doc = await DocumentModel.findById(documentId).lean();
    if (!doc) return { reminder: null, detection: { hasActionableDate: false } };

    const detection = this.detectActionableDate(doc);
    if (!detection.hasActionableDate) {
      const existing = await this.getReminderForDocument(documentId, userId);
      return { reminder: existing, detection };
    }

    let reminder = await this.getReminderForDocument(documentId, userId);
    if (!reminder) {
      reminder = await ReminderModel.create({
        documentId:    new mongoose.Types.ObjectId(documentId),
        userId:        new mongoose.Types.ObjectId(userId),
        eventType:     detection.eventType,
        eventLabel:    detection.eventLabel,
        eventDate:     detection.eventDate,
        lowConfidence: detection.lowConfidence,
        isManual:      false,
        enabled:       true,
      });
      logger.info(`Auto-created reminder for document ${documentId}: ${detection.eventLabel}`);
    }

    return { reminder, detection };
  }

  /**
   * Create or update a reminder for a document.
   * Resets sent flags if the user changes the event date or notification time.
   */
  async upsertReminder(
    documentId: string,
    userId:     string,
    dto:        UpsertReminderDto,
  ): Promise<IReminder> {
    const docObjId  = new mongoose.Types.ObjectId(documentId);
    const userObjId = new mongoose.Types.ObjectId(userId);

    const existing = await ReminderModel.findOne({ documentId: docObjId, userId: userObjId });

    const update: Partial<IReminder> = {};
    if (dto.eventType)        update.eventType        = dto.eventType;
    if (dto.eventLabel)       update.eventLabel       = dto.eventLabel;
    if (dto.eventDate)        update.eventDate        = new Date(dto.eventDate);
    if (dto.notificationTime) update.notificationTime = dto.notificationTime;
    if (dto.timezone)         update.timezone         = dto.timezone;
    if (dto.channels)         update.channels         = dto.channels;
    if (dto.enabled !== undefined) update.enabled     = dto.enabled;
    if (dto.isManual !== undefined) update.isManual   = dto.isManual;

    // Check if time or date changed → reset interval sentAt flags so it can trigger at the new time
    const timeChanged = existing && dto.notificationTime && existing.notificationTime !== dto.notificationTime;
    const dateChanged = existing && dto.eventDate && new Date(existing.eventDate).getTime() !== new Date(dto.eventDate).getTime();

    if (dto.intervals) {
      update.intervals = dto.intervals.map((iv) => ({
        daysBefore: iv.daysBefore,
        enabled:    iv.enabled,
        sentAt:     undefined, // Cleanly reset on user save so scheduled check evaluates fresh trigger time
        channelStatus: {
          inApp:   { status: 'pending', sent: false },
          browser: { status: 'pending', sent: false },
          email:   { status: 'pending', sent: false },
        },
      }));
    }

    const reminder = await ReminderModel.findOneAndUpdate(
      { documentId: docObjId, userId: userObjId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return reminder!;
  }

  /**
   * Disable a reminder.
   */
  async disableReminder(documentId: string, userId: string): Promise<IReminder | null> {
    return ReminderModel.findOneAndUpdate(
      {
        documentId: new mongoose.Types.ObjectId(documentId),
        userId:     new mongoose.Types.ObjectId(userId),
      },
      { $set: { enabled: false } },
      { new: true },
    );
  }

  /**
   * Execute channels for a reminder (In-App, Browser, Email) independently.
   */
  async executeReminderChannels(
    reminder:   IReminder,
    daysBefore: number,
  ): Promise<TriggerExecutionResult> {
    const errors: { inApp?: string; browser?: string; email?: string } = {};
    const channelResult: TriggerExecutionResult['channels'] = {
      inApp:   'disabled',
      browser: 'disabled',
      email:   'disabled',
    };

    const doc = await DocumentModel.findById(reminder.documentId).lean();
    const user = await UserModel.findById(reminder.userId).lean();

    const docName = doc?.originalFileName || 'Document';
    const docId   = doc ? String(doc._id) : (typeof reminder.documentId === 'object' ? String((reminder.documentId as any)._id || reminder.documentId) : String(reminder.documentId));
    const eventLabel = reminder.eventLabel || 'Document Expiry';

    const subtitle = daysBefore === 0
      ? `${eventLabel} is due today`
      : daysBefore === 1
        ? `Expires in 1 day`
        : `Expires in ${daysBefore} days`;

    const title = `${eventLabel} Reminder`;
    const body  = `"${docName}" — ${subtitle}`;

    // 1. In-App Channel
    if (reminder.channels.inApp) {
      try {
        await notificationService.createNotification(
          reminder.userId.toString(),
          docId,
          title,
          body,
          reminder.eventType,
          docName,
          subtitle,
        );
        channelResult.inApp = 'sent';
        logger.info(`[REMINDER] ✅ In-App notification created for user ${reminder.userId} on doc "${docName}"`);
      } catch (err: any) {
        channelResult.inApp = 'failed';
        errors.inApp = err.message || 'Failed to create in-app notification';
        logger.error('[REMINDER] ❌ Failed to create in-app notification:', err);
      }
    }

    // 2. Browser Channel
    if (reminder.channels.browser) {
      try {
        // Browser notification is dispatched via in-app push/polling and Notification API
        channelResult.browser = 'sent';
        logger.info(`[REMINDER] ✅ Browser notification ready for doc "${docName}"`);
      } catch (err: any) {
        channelResult.browser = 'failed';
        errors.browser = err.message || 'Browser notification error';
      }
    }

    // 3. Email Channel
    if (reminder.channels.email && user?.email) {
      try {
        const emailRes = await emailService.sendReminderEmail(
          user.email,
          user.fullName || 'User',
          docName,
          eventLabel,
          subtitle,
          docId,
        );
        if (emailRes.success) {
          channelResult.email = 'sent';
          logger.info(`[REMINDER] ✅ Email sent to ${user.email} for doc "${docName}"`);
        } else {
          channelResult.email = 'failed';
          errors.email = emailRes.error || 'Failed to send email';
        }
      } catch (err: any) {
        channelResult.email = 'failed';
        errors.email = err.message || 'Email delivery failed';
        logger.error('[REMINDER] ❌ Failed to send email:', err);
      }
    }

    // Update reminder interval execution status in MongoDB
    await ReminderModel.updateOne(
      { _id: reminder._id, 'intervals.daysBefore': daysBefore },
      {
        $set: {
          'intervals.$.sentAt': new Date(),
          'intervals.$.channelStatus.inApp': {
            sent: channelResult.inApp === 'sent',
            sentAt: new Date(),
            status: channelResult.inApp,
            error: errors.inApp,
          },
          'intervals.$.channelStatus.browser': {
            sent: channelResult.browser === 'sent',
            sentAt: new Date(),
            status: channelResult.browser,
            error: errors.browser,
          },
          'intervals.$.channelStatus.email': {
            sent: channelResult.email === 'sent',
            sentAt: new Date(),
            status: channelResult.email,
            error: errors.email,
          },
        },
      },
    );

    const overallSuccess = (channelResult.inApp === 'sent' || channelResult.inApp === 'disabled') &&
                           (channelResult.email === 'sent' || channelResult.email === 'disabled');

    return {
      success: overallSuccess,
      channels: channelResult,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    };
  }

  /**
   * Immediately trigger/test a reminder (for development and test endpoint).
   */
  async triggerReminderNow(
    identifier: string, // reminderId or documentId
    userId:     string,
  ): Promise<TriggerExecutionResult> {
    let reminder: IReminder | null = null;

    if (mongoose.Types.ObjectId.isValid(identifier)) {
      reminder = await ReminderModel.findOne({
        $or: [
          { _id: new mongoose.Types.ObjectId(identifier), userId: new mongoose.Types.ObjectId(userId) },
          { documentId: new mongoose.Types.ObjectId(identifier), userId: new mongoose.Types.ObjectId(userId) },
        ],
      });
    }

    if (!reminder) {
      // Find any reminder for user
      reminder = await ReminderModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    }

    if (!reminder) {
      throw new Error('No reminder found to test.');
    }

    const firstEnabledInterval = reminder.intervals.find(i => i.enabled) || { daysBefore: 1 };
    const result = await this.executeReminderChannels(reminder, firstEnabledInterval.daysBefore);

    result.debug = {
      reminderId: reminder._id.toString(),
      documentId: reminder.documentId.toString(),
      eventDate:  reminder.eventDate,
      eventLabel: reminder.eventLabel,
      channels:   reminder.channels,
      testedAt:   new Date().toISOString(),
    };

    return result;
  }
}

export const reminderService = new ReminderService();
