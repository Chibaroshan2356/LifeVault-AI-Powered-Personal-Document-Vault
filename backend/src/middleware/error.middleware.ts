/**
 * error.middleware.ts - Global Error Handler
 *
 * Catches every error thrown in route handlers and formats it
 * into a consistent ApiResponse. Must be the LAST middleware
 * registered in app.ts.
 *
 * Handled cases:
 *  - HttpError          — application-thrown errors with a status code
 *  - Mongoose ValidationError
 *  - MongoDB Duplicate Key (code 11000)
 *  - JWT errors
 *  - Multer errors
 *  - Fallback 500
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiResponse } from '../utils/ApiResponse';

/** Throw this anywhere in the app to return a specific HTTP status */
export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error(`${req.method} ${req.originalUrl}`, {
    name:    err.name,
    message: err.message,
    stack:   process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Application-level HTTP errors
  if (err instanceof HttpError) {
    res.status(err.statusCode).json(ApiResponse.error(err.message));
    return;
  }

  // Mongoose field validation
  if (err.name === 'ValidationError') {
    type MongooseErr = { errors: Record<string, { message: string }> };
    const e = err as unknown as MongooseErr;
    const errors = Object.entries(e.errors).map(([field, v]) => ({
      field,
      message: v.message,
    }));
    res.status(400).json(ApiResponse.error('Validation failed', errors));
    return;
  }

  // MongoDB duplicate key
  const mongoErr = err as { code?: number; keyValue?: Record<string, unknown> };
  if (mongoErr.code === 11000) {
    const field = Object.keys(mongoErr.keyValue ?? {})[0] ?? 'field';
    res.status(409).json(ApiResponse.error(`${field} already exists`));
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json(ApiResponse.error('Invalid token'));
    return;
  }
  if (err.name === 'TokenExpiredError') {
    res.status(401).json(ApiResponse.error('Token expired — please log in again'));
    return;
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    const m = err as { code: string };
    const msg = m.code === 'LIMIT_FILE_SIZE'
      ? 'File exceeds the size limit'
      : 'File upload error';
    res.status(400).json(ApiResponse.error(msg));
    return;
  }

  // Default 500
  const message = process.env.NODE_ENV === 'production'
    ? 'An internal server error occurred'
    : err.message;
  res.status(500).json(ApiResponse.error(message));
};
