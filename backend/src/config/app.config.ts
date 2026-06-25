/**
 * app.config.ts - Typed Application Configuration
 *
 * Single source of truth for all environment-based settings.
 * Import this wherever config values are needed — never read
 * process.env directly in application code.
 */

export interface AppConfig {
  nodeEnv:              string;
  port:                 number;
  mongodbUri:           string;
  jwtSecret:            string;
  jwtExpiresIn:         string;
  jwtRefreshSecret:     string;
  jwtRefreshExpiresIn:  string;
  maxFileSize:          number;
  allowedFileTypes:     string[];
  uploadDir:            string;
  aiServiceUrl:         string;
  aiServiceTimeout:     number;
  corsOrigin:           string;
  logLevel:             string;
}

export const appConfig: AppConfig = {
  nodeEnv:             process.env.NODE_ENV             || 'development',
  port:                parseInt(process.env.PORT        || '3000', 10),
  mongodbUri:          process.env.MONGODB_URI          || 'mongodb://localhost:27017/lifevault',
  jwtSecret:           process.env.JWT_SECRET           || 'dev-secret-CHANGE-IN-PROD',
  jwtExpiresIn:        process.env.JWT_EXPIRES_IN       || '7d',
  jwtRefreshSecret:    process.env.JWT_REFRESH_SECRET   || 'dev-refresh-CHANGE-IN-PROD',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  maxFileSize:         parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  allowedFileTypes:   (process.env.ALLOWED_FILE_TYPES   || 'application/pdf,image/jpeg,image/png,image/jpg').split(','),
  uploadDir:           process.env.UPLOAD_DIR           || 'uploads',
  aiServiceUrl:        process.env.AI_SERVICE_URL       || 'http://localhost:8000',
  aiServiceTimeout:    parseInt(process.env.AI_SERVICE_TIMEOUT || '30000', 10),
  corsOrigin:          process.env.CORS_ORIGIN          || 'http://localhost:4200',
  logLevel:            process.env.LOG_LEVEL            || 'debug',
};

/** Fail fast in production if critical secrets are missing */
export const validateConfig = (): void => {
  const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI'];
  if (process.env.NODE_ENV === 'production') {
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) {
      throw new Error(`Missing required production env vars: ${missing.join(', ')}`);
    }
  }
};
