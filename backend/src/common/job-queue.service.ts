/**
 * job-queue.service.ts - Background Job Queue
 *
 * Why background processing?
 *  OCR can take 5–30 seconds. Running it synchronously inside the upload
 *  request would block the response and time out on slow networks.
 *
 *  Instead:
 *   1. Upload handler saves the file and creates the DB record
 *   2. Upload handler enqueues an OCR job
 *   3. Upload handler returns HTTP 202 Accepted immediately
 *   4. This queue worker picks up the job and calls the AI service
 *   5. Worker updates the document status in MongoDB on completion
 *
 * Current implementation: in-process async queue (simple, no Redis needed)
 * Future upgrade path: swap enqueue() to BullMQ/Redis with zero changes
 *   to the document.service.ts code — it only calls this.queue.enqueue().
 *
 * Usage:
 *   import { jobQueue } from './job-queue.service';
 *   await jobQueue.enqueue({ documentId, userId, filePath, mimeType });
 */
import { logger } from '../utils/logger';
import { OCRJobPayload } from './interfaces';

type JobHandler = (payload: OCRJobPayload) => Promise<void>;

class JobQueueService {
  private handler: JobHandler | null = null;

  /**
   * Register the function that processes OCR jobs.
   * Called once at startup (in server.ts).
   *
   * @param fn - Async function that runs the AI pipeline for one document
   */
  register(fn: JobHandler): void {
    this.handler = fn;
    logger.info('JobQueue: OCR handler registered');
  }

  /**
   * Enqueue a new OCR job.
   * Returns immediately (non-blocking) — the job runs in the background.
   *
   * @param payload - Document info needed to run OCR
   */
  async enqueue(payload: OCRJobPayload): Promise<void> {
    if (!this.handler) {
      logger.warn('JobQueue: No handler registered — job dropped', { payload });
      return;
    }

    logger.info('JobQueue: Job enqueued', { documentId: payload.documentId });

    // Fire-and-forget: do not await — the caller gets a response immediately
    setImmediate(async () => {
      try {
        logger.info('JobQueue: Job started', { documentId: payload.documentId });
        await this.handler!(payload);
        logger.info('JobQueue: Job completed', { documentId: payload.documentId });
      } catch (err) {
        logger.error('JobQueue: Job failed', {
          documentId: payload.documentId,
          error: (err as Error).message,
        });
      }
    });
  }
}

/** Singleton — import this instance everywhere */
export const jobQueue = new JobQueueService();
