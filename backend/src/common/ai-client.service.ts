/**
 * ai-client.service.ts — HTTP Client for FastAPI AI Service
 *
 * Sends files to POST /process and returns structured pipeline results.
 * Handles connection errors gracefully — document processing failure
 * should not crash the Node.js server.
 */
import FormData from 'form-data';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { logger } from '../utils/logger';
import { appConfig } from '../config/app.config';

export interface AIProcessResult {
  success:                   boolean;
  document_id:               string;
  ocr_text:                  string;
  ocr_confidence:            number;
  document_type:             string;
  classification_confidence: number;
  metadata: {
    documentName?:   string | null;
    holderName?:     string | null;
    organization?:   string | null;
    documentNumber?: string | null;
    issueDate?:      string | null;
    expiryDate?:     string | null;
  };
  processing_time: number;
  version_info: {
    ocr_engine:             string;
    ocr_version:            string;
    classification_model:   string;
    classification_version: string;
  };
  error?: string;
}

class AIClientService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = appConfig.aiServiceUrl;
  }

  /** Check if the AI service is reachable */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.get('/health');
      return (result as { status?: string }).status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Send file bytes to the AI service for full pipeline processing.
   * @param fileBuffer  — file content
   * @param fileName    — original file name
   * @param mimeType    — MIME type
   * @param documentId  — MongoDB document ID
   */
  async processDocument(
    fileBuffer: Buffer,
    fileName:   string,
    mimeType:   string,
    documentId: string,
  ): Promise<AIProcessResult> {
    const form = new FormData();
    form.append('file', fileBuffer, {
      filename:    fileName,
      contentType: mimeType,
    });
    form.append('document_id', documentId);

    logger.info('Sending document to AI service', { documentId, mimeType, bytes: fileBuffer.length });

    const raw = await this.postForm('/process', form);
    const result = raw as AIProcessResult;

    logger.info('AI service response received', {
      documentId,
      success:    result.success,
      doc_type:   result.document_type,
      ocr_chars:  result.ocr_text?.length ?? 0,
      proc_time:  result.processing_time,
    });

    return result;
  }

  // ------------------------------------------------------------------
  // HTTP helpers (no external dependencies — native Node http module)
  // ------------------------------------------------------------------

  private get(path: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const url     = new URL(path, this.baseUrl);
      const client  = url.protocol === 'https:' ? https : http;
      const timeout = appConfig.aiServiceTimeout;

      const req = client.get(url.toString(), { timeout }, (res) => {
        let body = '';
        res.on('data', (chunk: string) => (body += chunk));
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch { reject(new Error(`Invalid JSON from AI service: ${body.substring(0, 100)}`)); }
        });
      });

      req.on('timeout', () => { req.destroy(); reject(new Error('AI service health check timed out')); });
      req.on('error', reject);
    });
  }

  private postForm(path: string, form: FormData): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const url     = new URL(path, this.baseUrl);
      const client  = url.protocol === 'https:' ? https : http;
      const headers = form.getHeaders();
      const timeout = appConfig.aiServiceTimeout;

      const options = {
        hostname: url.hostname,
        port:     url.port || (url.protocol === 'https:' ? 443 : 80),
        path:     url.pathname,
        method:   'POST',
        headers,
        timeout,
      };

      const req = client.request(options, (res) => {
        let body = '';
        res.on('data', (chunk: string) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`AI service returned ${res.statusCode}: ${body.substring(0, 200)}`));
            return;
          }
          try { resolve(JSON.parse(body)); }
          catch { reject(new Error(`Invalid JSON from AI service: ${body.substring(0, 100)}`)); }
        });
      });

      req.on('timeout', () => { req.destroy(); reject(new Error('AI service request timed out')); });
      req.on('error', reject);

      form.pipe(req);
    });
  }
}

export const aiClient = new AIClientService();
