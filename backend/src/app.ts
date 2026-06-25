/**
 * app.ts - Express Application Factory
 *
 * Creates and configures the Express app.
 * Kept separate from server.ts so the app can be imported in tests
 * without binding to a port.
 *
 * Middleware order (matters):
 *  1. Helmet        — security headers
 *  2. CORS          — cross-origin
 *  3. Rate limiter  — abuse prevention
 *  4. Morgan        — HTTP request logging
 *  5. Body parsers  — JSON + URL-encoded
 *  6. Static files  — /uploads served statically
 *  7. Health check  — /health (no auth required)
 *  8. API routes    — /api/v1/...
 *  9. 404 handler
 * 10. Error handler
 */
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/notFound.middleware';
import { logger } from './utils/logger';
import { apiRouter } from './modules';

export const createApp = (): Application => {
  const app = express();

  // ------------------------------------------------------------------
  // 1. Security
  // ------------------------------------------------------------------
  app.use(helmet());
  app.use(cors({
    origin:      process.env.CORS_ORIGIN || 'http://localhost:4200',
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

  // ------------------------------------------------------------------
  // 2. Rate limiting — 100 requests per 15 min per IP
  // ------------------------------------------------------------------
  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: ApiResponseError('Too many requests — try again after 15 minutes'),
  }));

  // ------------------------------------------------------------------
  // 3. HTTP Logging
  // ------------------------------------------------------------------
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined', {
      stream: { write: (msg: string) => logger.info(msg.trim()) },
    }));
  }

  // ------------------------------------------------------------------
  // 4. Body parsers
  // ------------------------------------------------------------------
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ------------------------------------------------------------------
  // 5. Static uploads (dev only — use CDN/S3 in production)
  // ------------------------------------------------------------------
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // ------------------------------------------------------------------
  // 6. Health check
  // ------------------------------------------------------------------
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'LifeVault API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // ------------------------------------------------------------------
  // 7. API routes — all under /api/v1
  // ------------------------------------------------------------------
  app.use('/api/v1', apiRouter);

  // ------------------------------------------------------------------
  // 8 & 9. Not-found + error handler (must be last)
  // ------------------------------------------------------------------
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

/** Helper used inline above before ApiResponse is imported */
function ApiResponseError(message: string) {
  return { success: false, message };
}
