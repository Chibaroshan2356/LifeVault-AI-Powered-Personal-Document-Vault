/**
 * app.ts - Express Application Factory
 *
 * Purpose: Creates and configures the Express application.
 * Separated from server.ts to allow testing the app without starting a server.
 *
 * Middleware Stack (in order):
 *  1. Helmet       - Security headers
 *  2. CORS         - Cross-origin resource sharing
 *  3. Rate Limiter - Prevent abuse
 *  4. Morgan       - HTTP request logging
 *  5. Body Parser  - JSON request body parsing
 *  6. Routes       - API route handlers
 *  7. 404 Handler  - Catch unmatched routes
 *  8. Error Handler - Global error handling
 *
 * Design Decision:
 *  - Factory function pattern (createApp) enables test isolation
 *  - Each concern is handled by dedicated middleware
 *  - Routes are modular and imported separately
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/notFound.middleware';
import { logger } from './utils/logger';
import { apiRouter } from './routes';

/**
 * Creates and configures the Express application.
 * Returns the configured app without starting the server.
 *
 * @returns Configured Express Application instance
 */
export const createApp = (): Application => {
  const app = express();

  // ============================================================
  // 1. SECURITY MIDDLEWARE
  // ============================================================

  /**
   * Helmet: Sets various HTTP headers to protect the app.
   * Prevents common vulnerabilities like XSS, clickjacking, etc.
   * Documentation: https://helmetjs.github.io/
   */
  app.use(helmet());

  /**
   * CORS: Controls which origins can access the API.
   * - In development, allows the Angular dev server (localhost:4200)
   * - In production, only allow the actual frontend domain
   */
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:4200';
  app.use(
    cors({
      origin: corsOrigin,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true, // Allow cookies and auth headers
    })
  );

  // ============================================================
  // 2. RATE LIMITING
  // ============================================================

  /**
   * Rate Limiter: Prevents brute force attacks and API abuse.
   * Limits each IP to 100 requests per 15-minute window.
   * Authentication endpoints have stricter limits (see auth router).
   */
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,                  // Max requests per window
    standardHeaders: true,     // Return rate limit info in headers
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again after 15 minutes',
    },
  });

  app.use('/api', limiter);

  // ============================================================
  // 3. REQUEST LOGGING
  // ============================================================

  /**
   * Morgan: HTTP request logger.
   * In development: 'dev' format (colored, concise)
   * In production: 'combined' format (detailed, Apache style)
   */
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  } else {
    // Stream Morgan output to Winston logger in production
    app.use(
      morgan('combined', {
        stream: {
          write: (message: string) => logger.info(message.trim()),
        },
      })
    );
  }

  // ============================================================
  // 4. BODY PARSING
  // ============================================================

  /**
   * JSON body parser: Parses incoming JSON request bodies.
   * 10mb limit to handle base64 encoded file data if needed.
   */
  app.use(express.json({ limit: '10mb' }));

  /**
   * URL-encoded body parser: Handles form submissions.
   * extended: true allows rich objects and arrays in URL-encoded data.
   */
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ============================================================
  // 5. STATIC FILES
  // ============================================================

  /**
   * Serve uploaded files statically.
   * Files are accessible at /uploads/{filename}
   * Note: In production, use a CDN or cloud storage instead.
   */
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // ============================================================
  // 6. HEALTH CHECK
  // ============================================================

  /**
   * Health check endpoint: Used by load balancers and monitoring.
   * Returns a simple 200 response if the server is running.
   */
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'LifeVault Backend',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // ============================================================
  // 7. API ROUTES
  // ============================================================

  /**
   * All API routes are prefixed with /api
   * The apiRouter contains all versioned route modules.
   */
  app.use('/api', apiRouter);

  // ============================================================
  // 8. ERROR HANDLING (must be last)
  // ============================================================

  /**
   * 404 Handler: Catches all unmatched routes.
   * Must be registered before the error handler.
   */
  app.use(notFoundHandler);

  /**
   * Global Error Handler: Catches all errors thrown in route handlers.
   * Express recognizes error handlers by their 4-parameter signature (err, req, res, next).
   * Must be the LAST middleware registered.
   */
  app.use(errorHandler);

  return app;
};
