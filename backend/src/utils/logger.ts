/**
 * logger.ts - Winston Logger
 *
 * - Development: colorized console output
 * - Production: JSON to console + rotating file (logs/app.log, logs/error.log)
 *
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.info('Server started', { port: 3000 });
 *   logger.error('DB connection failed', error);
 */
import winston from 'winston';
import path from 'path';

const { combine, timestamp, colorize, printf, json, errors } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${ts}] ${level.toUpperCase()}: ${message}${extra}`;
});

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      devFormat,
    ),
  }),
];

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join('logs', 'app.log'),
      format: combine(timestamp(), errors({ stack: true }), json()),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      format: combine(timestamp(), errors({ stack: true }), json()),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transports,
  exitOnError: false,
});
