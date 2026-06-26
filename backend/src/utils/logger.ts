/**
 * logger.ts - Structured Winston Logger
 *
 * Log files:
 *  logs/application.log  — all levels (debug+)
 *  logs/error.log        — errors only
 *  logs/access.log       — HTTP request logs (via Morgan stream)
 *
 * Each log entry in production includes a requestId when available,
 * allowing a single request to be traced across log lines.
 *
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.info('User registered', { userId, email });
 *   logger.error('DB error', { error: err.message, stack: err.stack });
 */
import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists at startup
const LOG_DIR = 'logs';
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const { combine, timestamp, colorize, printf, json, errors } = winston.format;

// ------------------------------------------------------------------
// Formats
// ------------------------------------------------------------------

/** Human-readable colorized format for development console */
const devFormat = printf(({ level, message, timestamp: ts, requestId, ...meta }) => {
  const reqId = requestId ? ` [${requestId}]` : '';
  const extra = Object.keys(meta).length ? `\n  ${JSON.stringify(meta, null, 2)}` : '';
  return `[${ts}] ${level.toUpperCase()}${reqId}: ${message}${extra}`;
});

/** JSON format for production — parseable by log aggregators */
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
);

// ------------------------------------------------------------------
// Transports
// ------------------------------------------------------------------

const consoleTransport = new winston.transports.Console({
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'HH:mm:ss' }),
    errors({ stack: true }),
    devFormat,
  ),
});

/** application.log — all log levels */
const appFileTransport = new winston.transports.File({
  filename: path.join(LOG_DIR, 'application.log'),
  format: prodFormat,
  maxsize: 10 * 1024 * 1024, // 10 MB
  maxFiles: 5,
  tailable: true,
});

/** error.log — errors only */
const errorFileTransport = new winston.transports.File({
  filename: path.join(LOG_DIR, 'error.log'),
  level: 'error',
  format: prodFormat,
  maxsize: 10 * 1024 * 1024,
  maxFiles: 5,
  tailable: true,
});

// ------------------------------------------------------------------
// Logger instance
// ------------------------------------------------------------------

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transports: [
    consoleTransport,
    ...(process.env.NODE_ENV === 'production'
      ? [appFileTransport, errorFileTransport]
      : [appFileTransport, errorFileTransport]), // write files in all environments
  ],
  exitOnError: false,
});

// ------------------------------------------------------------------
// Morgan HTTP Access Log stream → logs/access.log
// ------------------------------------------------------------------

const accessTransport = new winston.transports.File({
  filename: path.join(LOG_DIR, 'access.log'),
  format: prodFormat,
  maxsize: 10 * 1024 * 1024,
  maxFiles: 10,
  tailable: true,
});

const accessLogger = winston.createLogger({
  level: 'http',
  transports: [accessTransport],
});

/**
 * Morgan-compatible write stream.
 * Pass to morgan: morgan('combined', { stream: morganStream })
 */
export const morganStream = {
  write: (message: string): void => {
    accessLogger.http(message.trim());
  },
};
