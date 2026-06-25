/**
 * logger.ts - Winston Logger Utility
 *
 * Purpose: Centralized logging utility for the application.
 * Replaces console.log with structured, configurable logging.
 *
 * Why Winston?
 *  - Log levels (error, warn, info, debug)
 *  - Multiple transports (console, file, external services)
 *  - Structured JSON logging for production
 *  - Easy to integrate with monitoring services (Datadog, CloudWatch)
 *
 * Log Levels (in order of severity):
 *  error   - Application errors that need immediate attention
 *  warn    - Unexpected behavior that doesn't break functionality
 *  info    - Important application events (startup, DB connection)
 *  debug   - Detailed information for debugging (dev only)
 *
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.info('User logged in', { userId: '123' });
 *   logger.error('Database connection failed', error);
 */

import winston from 'winston';
import path from 'path';

const { combine, timestamp, colorize, printf, json, errors } = winston.format;

/**
 * Custom log format for development: colorized and human-readable.
 * Output: [2024-01-01 12:00:00] INFO: Server started on port 3000
 */
const devFormat = printf(({ level, message, timestamp: ts, ...metadata }) => {
  let log = `[${ts}] ${level.toUpperCase()}: ${message}`;

  // Append any additional metadata
  if (Object.keys(metadata).length > 0) {
    log += ` ${JSON.stringify(metadata)}`;
  }

  return log;
});

/**
 * Development transport: Colorized console output.
 * Makes logs easy to read during development.
 */
const consoleTransport = new winston.transports.Console({
  format: combine(
    colorize({ all: true }),        // Add colors to log levels
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),        // Include stack traces for errors
    devFormat
  ),
});

/**
 * Production transport: JSON file logging.
 * Structured logs that can be parsed by log aggregation tools.
 */
const fileTransport = new winston.transports.File({
  filename: path.join('logs', 'app.log'),
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()                          // JSON format for structured logging
  ),
  maxsize: 5 * 1024 * 1024,        // 5MB per file
  maxFiles: 5,                      // Keep last 5 log files
  tailable: true,
});

/**
 * Error-specific transport: Separate file for errors only.
 * Makes it easier to find and alert on critical issues.
 */
const errorFileTransport = new winston.transports.File({
  filename: path.join('logs', 'error.log'),
  level: 'error',                   // Only log 'error' level to this file
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()
  ),
  maxsize: 5 * 1024 * 1024,
  maxFiles: 5,
  tailable: true,
});

/**
 * Winston logger instance.
 * Used throughout the application for all logging.
 */
export const logger = winston.createLogger({
  /**
   * Log level: Controls which messages are logged.
   * Only messages at this level and above (higher severity) are logged.
   * Reads from environment variable with fallback to 'debug' in dev, 'info' in prod.
   */
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  /**
   * Transports: Where logs are sent.
   * Always log to console. Add file transports in production.
   */
  transports: [
    consoleTransport,
    ...(process.env.NODE_ENV === 'production'
      ? [fileTransport, errorFileTransport]
      : []),
  ],

  /**
   * Exit on error: true would cause the process to exit on transport errors.
   * Set to false to allow the app to continue even if logging fails.
   */
  exitOnError: false,
});
