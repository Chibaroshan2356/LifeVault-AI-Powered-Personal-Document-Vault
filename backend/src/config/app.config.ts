/**
 * app.config.ts - Application Configuration
 *
 * Purpose: Centralizes all application configuration values.
 * Reads from environment variables and provides typed, validated config.
 *
 * Design Decision:
 *  - Single source of truth for configuration
 *  - Validates required variables early (fail fast principle)
 *  - Provides sensible defaults for optional variables
 *  - Typed interface prevents typos in config access
 *
 * Usage:
 *   import { appConfig } from './config/app.config';
 *   const port = appConfig.port;
 */

/**
 * Interface defining the shape of the application configuration.
 * TypeScript ensures we always use valid config keys.
 */
export interface AppConfig {
  // Server
  nodeEnv: string;
  port: number;

  // Database
  mongodbUri: string;

  // JWT Authentication
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiresIn: string;

  // File Upload
  maxFileSize: number;
  allowedFileTypes: string[];
  uploadDir: string;

  // AI Service
  aiServiceUrl: string;
  aiServiceTimeout: number;

  // CORS
  corsOrigin: string;

  // Logging
  logLevel: string;
}

/**
 * Application configuration object.
 * Values are read from process.env and validated.
 *
 * Note: dotenv must be loaded before this file is imported.
 * It is loaded in server.ts via: import 'dotenv/config'
 */
export const appConfig: AppConfig = {
  // ============================================================
  // Server Configuration
  // ============================================================
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  // ============================================================
  // Database Configuration
  // ============================================================
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/lifevault',

  // ============================================================
  // JWT Configuration
  // ============================================================
  jwtSecret: process.env.JWT_SECRET || 'fallback-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-in-production',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // ============================================================
  // File Upload Configuration
  // ============================================================
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  allowedFileTypes: (
    process.env.ALLOWED_FILE_TYPES ||
    'application/pdf,image/jpeg,image/png,image/jpg'
  ).split(','),
  uploadDir: process.env.UPLOAD_DIR || 'uploads',

  // ============================================================
  // AI Service Configuration
  // ============================================================
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  aiServiceTimeout: parseInt(process.env.AI_SERVICE_TIMEOUT || '30000', 10),

  // ============================================================
  // CORS Configuration
  // ============================================================
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',

  // ============================================================
  // Logging Configuration
  // ============================================================
  logLevel: process.env.LOG_LEVEL || 'debug',
};

/**
 * Validates that critical configuration values are present.
 * Called at startup to fail fast if config is missing.
 *
 * @throws Error if a required configuration value is missing
 */
export const validateConfig = (): void => {
  const requiredInProduction = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI'];

  if (process.env.NODE_ENV === 'production') {
    const missing = requiredInProduction.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables in production: ${missing.join(', ')}`
      );
    }
  }
};
