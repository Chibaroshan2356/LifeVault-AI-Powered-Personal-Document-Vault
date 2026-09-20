import { Request, Response } from 'express';
import { reminderService }   from './reminder.service';
import { ReminderModel }     from './reminder.model';
import { logger }            from '../../utils/logger';

/**
 * GET /api/v1/reminders/:documentId
 * Returns existing reminder or auto-detects from document metadata.
 */
export async function getReminderForDocument(req: Request, res: Response): Promise<void> {
  const userId     = req.user?.sub;
  const { documentId } = req.params;

  if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

  try {
    const { reminder, detection } = await reminderService.getOrCreateReminderFromDocument(documentId, userId);
    res.status(200).json({ success: true, data: { reminder, detection } });
  } catch (err: any) {
    logger.error('getReminderForDocument error', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/v1/reminders/:documentId
 * Create or update a reminder for a document.
 */
export async function upsertReminder(req: Request, res: Response): Promise<void> {
  const userId     = req.user?.sub;
  const { documentId } = req.params;

  if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

  try {
    const reminder = await reminderService.upsertReminder(documentId, userId, req.body);
    res.status(200).json({ success: true, data: reminder });
  } catch (err: any) {
    logger.error('upsertReminder error', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * DELETE /api/v1/reminders/:documentId
 * Disable (soft-delete) reminder for a document.
 */
export async function disableReminder(req: Request, res: Response): Promise<void> {
  const userId     = req.user?.sub;
  const { documentId } = req.params;

  if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

  try {
    const reminder = await reminderService.disableReminder(documentId, userId);
    res.status(200).json({ success: true, data: reminder });
  } catch (err: any) {
    logger.error('disableReminder error', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/v1/reminders/test or POST /api/v1/reminders/:documentId/test
 * Immediately triggers a reminder across all enabled channels for instant testing.
 */
export async function testReminderTrigger(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  const { documentId } = req.params;

  if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

  try {
    const result = await reminderService.triggerReminderNow(documentId || req.body?.documentId || req.body?.reminderId, userId);
    res.status(200).json({
      success: result.success,
      channels: result.channels,
      errors: result.errors,
      debug: result.debug,
    });
  } catch (err: any) {
    logger.error('testReminderTrigger error', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/v1/reminders/:documentId/debug
 * Returns comprehensive debug state for a reminder.
 */
export async function getReminderDebug(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  const { documentId } = req.params;

  if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

  try {
    const reminder = await reminderService.getReminderForDocument(documentId, userId);
    const now = new Date();

    if (!reminder) {
      res.status(404).json({ success: false, message: 'No reminder found for this document' });
      return;
    }

    const debugInfo = {
      reminderId:            reminder._id,
      documentId:            reminder.documentId,
      eventLabel:            reminder.eventLabel,
      eventDate:             reminder.eventDate,
      notificationTime:      reminder.notificationTime,
      timezone:              reminder.timezone,
      enabled:               reminder.enabled,
      channels:              reminder.channels,
      intervals:             reminder.intervals,
      currentTimeUTC:        now.toISOString(),
      currentTimeLocal:      now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      serverTimezone:        Intl.DateTimeFormat().resolvedOptions().timeZone,
      serverTimezoneOffset:  now.getTimezoneOffset(),
    };

    res.status(200).json({ success: true, data: debugInfo });
  } catch (err: any) {
    logger.error('getReminderDebug error', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/v1/reminders/test-email
 * Instantly sends a direct test email using Gmail SMTP.
 */
export async function sendTestEmailController(req: Request, res: Response): Promise<void> {
  try {
    const targetEmail = req.body?.to || 'chibaroshan2387@gmail.com';
    const { emailService } = await import('../../common/email.service');
    const result = await emailService.sendTestEmail(targetEmail);
    res.status(200).json({
      success:   result.success,
      status:    result.status,
      messageId: result.messageId,
      error:     result.error,
    });
  } catch (err: any) {
    logger.error('sendTestEmailController error', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

