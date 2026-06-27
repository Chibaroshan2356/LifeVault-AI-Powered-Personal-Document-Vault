/**
 * ocr-worker.ts — OCR Job Queue Handler
 *
 * Registered as the jobQueue handler in server.ts.
 * Processes each document through the AI service pipeline.
 *
 * Flow:
 *  1. Load file bytes from storage
 *  2. Call aiClient.processDocument()
 *  3. Update MongoDB document with results
 *  4. Update processingHistory and status
 */
import { DocumentModel }   from '../modules/document/document.model';
import { LocalStorageService } from './local-storage.service';
import { aiClient }        from './ai-client.service';
import { logger }          from '../utils/logger';
import { DocumentStatus, ProcessingStage, ProcessingStageStatus } from './enums';
import type { OCRJobPayload } from './interfaces';

const storage = new LocalStorageService();

export async function ocrJobHandler(payload: OCRJobPayload): Promise<void> {
  const { documentId, userId, filePath, mimeType } = payload;
  const startTime = Date.now();

  logger.info('OCR job started', { documentId });

  // ── 0. Health check: Verify AI service is available ──────────
  const aiServiceHealthy = await aiClient.healthCheck();
  if (!aiServiceHealthy) {
    logger.error('AI service is unavailable', { documentId });
    
    // Update document with AI_UNAVAILABLE status
    await DocumentModel.findByIdAndUpdate(documentId, {
      status: DocumentStatus.FAILED,
      errorMessage: 'AI service is currently unavailable. Please try again later.',
      $push: {
        processingHistory: {
          stage:      ProcessingStage.OCR,
          status:     ProcessingStageStatus.FAILED,
          timestamp:  new Date(),
          error:      'AI service health check failed',
        },
      },
    });
    
    throw new Error('AI service health check failed');
  }

  // ── 1. Mark as OCR_PENDING ──────────────────────────────────────
  await DocumentModel.findByIdAndUpdate(documentId, {
    status: DocumentStatus.OCR_PENDING,
    $push: {
      processingHistory: {
        stage:      ProcessingStage.OCR,
        status:     ProcessingStageStatus.STARTED,
        timestamp:  new Date(),
      },
    },
  });

  try {
    // ── 2. Load file from storage ───────────────────────────────
    let fileBuffer: Buffer;
    try {
      fileBuffer = await storage.get(filePath);
    } catch (err) {
      throw new Error(`Failed to read file from storage: ${(err as Error).message}`);
    }

    // ── 3. Call AI service ──────────────────────────────────────
    const doc = await DocumentModel.findById(documentId);
    if (!doc) throw new Error('Document not found in DB');

    const result = await aiClient.processDocument(
      fileBuffer,
      doc.originalFileName,
      mimeType,
      documentId,
    );

    if (!result.success) {
      throw new Error(result.error ?? 'AI service returned failure');
    }

    // ── 4. Store results in MongoDB ─────────────────────────────
    const durationMs = Date.now() - startTime;

    await DocumentModel.findByIdAndUpdate(documentId, {
      status:        DocumentStatus.READY,
      ocrText:       result.ocr_text,
      ocrConfidence: result.ocr_confidence,
      category:      result.document_type,

      metadata: {
        holderName:     result.metadata.holderName     ?? undefined,
        documentName:   result.metadata.documentName   ?? undefined,
        organization:   result.metadata.organization   ?? undefined,
        documentNumber: result.metadata.documentNumber ?? undefined,
        issueDate:      result.metadata.issueDate
          ? new Date(result.metadata.issueDate) : undefined,
        expiryDate:     result.metadata.expiryDate
          ? new Date(result.metadata.expiryDate) : undefined,
      },

      expiryDate: result.metadata.expiryDate
        ? new Date(result.metadata.expiryDate) : null,

      aiVersionInfo: {
        ocrEngine:             result.version_info.ocr_engine,
        ocrVersion:            result.version_info.ocr_version,
        classificationModel:   result.version_info.classification_model,
        classificationVersion: result.version_info.classification_version,
      },

      errorMessage: null,

      $push: {
        processingHistory: {
          stage:      ProcessingStage.OCR,
          status:     ProcessingStageStatus.COMPLETED,
          timestamp:  new Date(),
          durationMs,
        },
      },
    });

    logger.info('OCR job completed', {
      documentId,
      docType:     result.document_type,
      ocrChars:    result.ocr_text.length,
      durationMs,
    });

  } catch (err) {
    const message = (err as Error).message;
    const durationMs = Date.now() - startTime;

    logger.error('OCR job failed', { documentId, error: message });

    await DocumentModel.findByIdAndUpdate(documentId, {
      status:       DocumentStatus.FAILED,
      errorMessage: message,
      $push: {
        processingHistory: {
          stage:      ProcessingStage.OCR,
          status:     ProcessingStageStatus.FAILED,
          timestamp:  new Date(),
          durationMs,
          error:      message,
        },
      },
    });

    throw err; // re-throw so JobQueueService logs it
  }
}
