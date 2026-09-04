import { Router }      from 'express';
import { authenticate } from '../../middleware/authenticate.middleware';
import {
  getReminderForDocument,
  upsertReminder,
  disableReminder,
  testReminderTrigger,
  getReminderDebug,
  sendTestEmailController,
} from './reminder.controller';

export const reminderRouter = Router();

reminderRouter.use(authenticate);

reminderRouter.post('/test-email',          sendTestEmailController);
reminderRouter.post('/test',               testReminderTrigger);
reminderRouter.post('/:documentId/test',   testReminderTrigger);
reminderRouter.get( '/:documentId/debug',  getReminderDebug);
reminderRouter.get( '/:documentId',        getReminderForDocument);
reminderRouter.put( '/:documentId',        upsertReminder);
reminderRouter.delete('/:documentId',      disableReminder);

