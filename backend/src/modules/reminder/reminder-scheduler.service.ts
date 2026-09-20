/**
 * reminder-scheduler.service.ts — Minute-by-Minute Smart Reminder Scheduler
 *
 * Runs every minute (* * * * *).
 * Evaluates trigger dates, target notification times (e.g. 11:35 AM), and timezones.
 * Executes In-App, Browser, and Email channels independently.
 * Prevents duplicate firing on the same day.
 */
import cron, { ScheduledTask } from 'node-cron';
import { ReminderModel, IReminder } from './reminder.model';
import { reminderService } from './reminder.service';
import { logger } from '../../utils/logger';

/**
 * Parses a Date into local year, month (0-indexed), and day components.
 */
function getDateParts(d: Date): { year: number; month: number; day: number } {
  // If stored as UTC midnight (e.g. 2026-09-01T00:00:00.000Z), extract UTC date parts
  // to avoid timezone drift across midnight.
  return {
    year:  d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day:   d.getUTCDate(),
  };
}

/**
 * Formats a Date into YYYY-MM-DD string.
 */
function toDateString(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export async function runReminderCheck(): Promise<{ checked: number; triggered: number }> {
  const now = new Date();
  const currentLocalString = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  logger.info(`[REMINDER SCHEDULER] Checking reminders at: ${now.toISOString()} | Local IST: ${currentLocalString}`);

  // Find all active, enabled reminders
  const reminders = await ReminderModel.find({ enabled: true }).populate('documentId', 'originalFileName category');

  let triggeredCount = 0;

  for (const reminder of reminders) {
    if (!reminder.eventDate) continue;

    const { year: evYear, month: evMonth, day: evDay } = getDateParts(new Date(reminder.eventDate));
    const eventDateObj = new Date(evYear, evMonth, evDay);

    // Parse notification time (default "09:00")
    const [notifHoursStr, notifMinsStr] = (reminder.notificationTime || '09:00').split(':');
    const notifHours = parseInt(notifHoursStr || '9', 10);
    const notifMins  = parseInt(notifMinsStr || '0', 10);

    for (const interval of reminder.intervals) {
      if (!interval.enabled) continue;

      // Calculate trigger calendar day: eventDate - daysBefore
      const targetTriggerDate = new Date(eventDateObj);
      targetTriggerDate.setDate(targetTriggerDate.getDate() - interval.daysBefore);

      const trigYear  = targetTriggerDate.getFullYear();
      const trigMonth = targetTriggerDate.getMonth();
      const trigDay   = targetTriggerDate.getDate();

      // Construct exact trigger timestamp in local time
      const triggerDateTime = new Date(trigYear, trigMonth, trigDay, notifHours, notifMins, 0, 0);

      // Check if trigger time has arrived and is within the 24-hour trigger window
      const diffMs = now.getTime() - triggerDateTime.getTime();
      const hoursOverdue = diffMs / (1000 * 60 * 60);

      // Must be past/equal trigger time, but NOT older than 24 hours (stale past intervals)
      const isWindowActive = hoursOverdue >= 0 && hoursOverdue < 24;

      // Duplicate prevention: check if this interval was already triggered today
      let alreadySentToday = false;
      if (interval.sentAt) {
        const sentDate = new Date(interval.sentAt);
        const hoursSinceSent = (now.getTime() - sentDate.getTime()) / (1000 * 60 * 60);
        if (hoursSinceSent < 18) {
          alreadySentToday = true;
        }
      }

      if (isWindowActive && !alreadySentToday) {
        const doc = (reminder as any).documentId;
        const docName = typeof doc === 'object' ? doc?.originalFileName : 'Document';

        logger.info('====================================================');
        logger.info('[REMINDER SCHEDULER] 🔔 DUE REMINDER FOUND!');
        logger.info(`Reminder ID:       ${reminder._id}`);
        logger.info(`Document:          "${docName}"`);
        logger.info(`Event Label:       ${reminder.eventLabel}`);
        logger.info(`Event Date:        ${toDateString(evYear, evMonth, evDay)}`);
        logger.info(`Days Before:       ${interval.daysBefore}`);
        logger.info(`Trigger DateTime:  ${triggerDateTime.toString()}`);
        logger.info(`Current DateTime:  ${now.toString()}`);
        logger.info(`Channels:          In-App: ${reminder.channels.inApp}, Browser: ${reminder.channels.browser}, Email: ${reminder.channels.email}`);
        logger.info('====================================================');

        // Execute all enabled channels
        await reminderService.executeReminderChannels(reminder, interval.daysBefore);
        triggeredCount++;
      }
    }
  }

  logger.info(`[REMINDER SCHEDULER] Check complete. Total active: ${reminders.length}, Triggered: ${triggeredCount}`);
  return { checked: reminders.length, triggered: triggeredCount };
}

let schedulerJob: ScheduledTask | null = null;

export function startReminderScheduler(): void {
  if (schedulerJob) {
    schedulerJob.stop();
  }

  // Run every minute: * * * * *
  schedulerJob = cron.schedule('* * * * *', async () => {
    try {
      await runReminderCheck();
    } catch (err) {
      logger.error('[REMINDER SCHEDULER] ❌ Unhandled error in reminder check loop:', err);
    }
  });

  // Run initial check immediately on server startup (delayed 3s for DB readiness)
  setTimeout(async () => {
    try {
      logger.info('[REMINDER SCHEDULER] 🚀 Running startup reminder check...');
      await runReminderCheck();
    } catch (err) {
      logger.error('[REMINDER SCHEDULER] Startup check error:', err);
    }
  }, 3000);

  logger.info('[REMINDER SCHEDULER] ✅ Smart Reminder scheduler running EVERY MINUTE (* * * * *)');
}
