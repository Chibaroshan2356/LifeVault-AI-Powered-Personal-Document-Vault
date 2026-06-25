/**
 * error.middleware.ts - Global Error Handling Middleware
 *
 * Purpose: Catches all errors thrown in route handlers and formats
 * them into consistent API error responses.
 *
 * Why Centralized Error Handling?
 *  - Consistent error response format across all routes
 *  - Single place to log errors
 *  - Hides implementation details from clients in production
 *  - Handles both expected (HttpError) and unexpected errors
 *
 * Error Types Handled:
 *  - HttpError: Application-defined errors with status codes
 *  - Mongoose ValidationError: Database validation failures
 *  - MongoDB Duplicate Key Error (code 11000)
 *  - JWT Errors: Invalid or expired tokens
 *  - Generic Errors: Unexpected server errors
 *
 * Usage: Must be the LAST middleware registered in app.ts
 *   app.use(errorHandler);
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiResponse } from '../utils/ApiResponse';

/**
 * Custom HTTP Error class.
 * Allows throwing errors with specific HTTP status codes from anywhere.
 *
 * Usage:
 *   throw new HttpError(404, 'Document not found');
 *   throw new HttpError(403, 'Access denied');
 */
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';

    // Maintains proper stack trace in V8 engines
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware.
 * Express identifies error handlers by the 4-parameter signature.
 *
 * @param err - The error that was thrown
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function (required even if not used)
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error details (always log the full error internally)
  logger.error(`❌ Error on ${req.method} ${req.url}:`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    name: err.name,
  });

  // ============================================================
  // Handle Custom HttpError
  // ============================================================
  if (err instanceof HttpError) {
    res.status(err.statusCode).json(ApiResponse.error(err.message));
    return;
  }

  // ============================================================
  // Handle Mongoose Validation Errors
  // ============================================================
  if (err.name === 'ValidationError') {
    const mongooseErrors = err as unknown as {
      errors: { [key: string]: { message: string } };
    };
    const validationErrors = Object.keys(mongooseErrors.errors).map((field) => ({
      field,
      message: mongooseErrors.errors[field].message,
    }));

    res.status(400).json(
      ApiResponse.error('Validation failed', validationErrors)
    );
    return;
  }

  // ============================================================
  // Handle MongoDB Duplicate Key Error
  // ============================================================
  const mongoError = err as { code?: number; keyValue?: Record<string, unknown> };
  if (mongoError.code === 11000) {
    const field = Object.keys(mongoError.keyValue || {})[0] || 'field';
    res.status(409).json(
      ApiResponse.error(`${field} already exists`)
    );
    return;
  }

  // ============================================================
  // Handle JWT Errors
  // ============================================================
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json(ApiResponse.error('Invalid token'));
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json(ApiResponse.error('Token expired, please login again'));
    return;
  }

  // ============================================================
  // Handle Multer File Upload Errors
  // ============================================================
  if (err.name === 'MulterError') {
    const multerError = err as { code: string };
    if (multerError.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json(ApiResponse.error('File size exceeds the allowed limit'));
      return;
    }
    res.status(400).json(ApiResponse.error('File upload error'));
    return;
  }

  // ============================================================
  // Default: Unhandled Server Error (500)
  // ============================================================
  // Hide error details in production to prevent information leakage
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred'
      : err.message;

  res.status(500).json(ApiResponse.error(message));
};
