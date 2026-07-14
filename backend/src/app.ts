/**
 * app.ts - Express Application Factory
 *
 * Creates and configures the Express app instance.
 * Separated from server.ts so the app can be tested without binding a port.
 *
 * Middleware order (critical — do not reorder):
 *  1. requestId        — attach unique ID for log tracing
 *  2. Helmet           — security headers
 *  3. CORS             — cross-origin policy
 *  4. Rate limiter     — abuse prevention
 *  5. Morgan           — HTTP access log → logs/access.log
 *  6. Body parsers     — JSON + URL-encoded
 *  7. Static uploads   — /uploads served statically
 *  8. Health check     — GET /health (no auth, no rate limit)
 *  9. Swagger UI       — GET /api-docs (interactive documentation)
 * 10. API routes       — /api/v1/*
 * 11. 404 handler
 * 12. Error handler    — must be last
 */
import 'express-async-errors'; // Patches async route handlers to forward errors to next()
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

import { requestIdMiddleware } from './middleware/requestId.middleware';
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/notFound.middleware';
import { logger, morganStream } from './utils/logger';
import { swaggerSpec } from './config/swagger';
import { apiRouter } from './modules';

export const createApp = (): Application => {
  const app = express();

  // ----------------------------------------------------------------
  // 1. Request ID — first, so all subsequent middleware can use it
  // ----------------------------------------------------------------
  app.use(requestIdMiddleware);

  // ----------------------------------------------------------------
  // 2. Security headers
  // ----------------------------------------------------------------
  app.use(
    helmet({
      // Allow Swagger UI to load its inline scripts and styles
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      // Disable frameguard in development to allow previewing documents in iframes from localhost:4200
      frameguard:            process.env.NODE_ENV === 'production' ? { action: 'sameorigin' } : false,
      // Allow cross-origin resource requests for preview files/images
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // ----------------------------------------------------------------
  // 3. CORS
  // ----------------------------------------------------------------
  app.use(cors({
    origin:         process.env.CORS_ORIGIN || 'http://localhost:4200',
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    credentials:    true,
  }));

  // ----------------------------------------------------------------
  // 4. Rate limiting — 100 req / 15 min per IP on all /api routes
  // ----------------------------------------------------------------
  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    max:      process.env.NODE_ENV === 'development' ? 10000 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests — try again after 15 minutes' },
  }));

  // ----------------------------------------------------------------
  // 5. HTTP access logging → logs/access.log
  // ----------------------------------------------------------------
  app.use(morgan('combined', { stream: morganStream }));
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev')); // also log colorized to console in dev
  }

  // ----------------------------------------------------------------
  // 6. Body parsers
  // ----------------------------------------------------------------
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ----------------------------------------------------------------
  // 7. Static file serving for uploads
  // ----------------------------------------------------------------
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // ----------------------------------------------------------------
  // 8. Health check (exempt from rate limiting)
  // ----------------------------------------------------------------
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status:      'ok',
      service:     'LifeVault Backend',
      version:     '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp:   new Date().toISOString(),
    });
  });

  // ----------------------------------------------------------------
  // 9. Swagger UI — interactive API documentation
  //    Access at: http://localhost:3000/api-docs
  // ----------------------------------------------------------------
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'LifeVault API Docs',
      swaggerOptions: {
        persistAuthorization: true, // keep JWT between page refreshes
      },
    }),
  );

  // Expose the raw OpenAPI JSON spec (useful for Postman import)
  app.get('/api-docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // ----------------------------------------------------------------
  // 10. API routes — /api/v1/*
  // ----------------------------------------------------------------
  app.use('/api/v1', apiRouter);

  // ----------------------------------------------------------------
  // 11 & 12. Not-found + global error handler (always last)
  // ----------------------------------------------------------------
  app.use(notFoundHandler);
  app.use(errorHandler);

  logger.info('Express app configured');
  return app;
};
