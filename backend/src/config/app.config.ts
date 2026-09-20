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

  /* Gmail SMTP Email Configuration */
  emailHost:            string;
  emailPort:            number;
  emailUser:            string;
  emailPassword:        string;
  emailFrom:            string;

  /* Security & Theft-Protection Thresholds */
  failedLoginThreshold:       number;
  failedLoginWindowMinutes:   number;
  downloadThreshold:          number;
  downloadWindowMinutes:      number;

  /* Backblaze B2 (S3-Compatible) Cloud Storage */
  storageProvider:            'local' | 'b2';
  b2Endpoint:                 string;
  b2Region:                   string;
  b2BucketName:               string;
  b2KeyId:                    string;
  b2ApplicationKey:           string;
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
  aiServiceTimeout:    parseInt(process.env.AI_SERVICE_TIMEOUT || '180000', 10),
  corsOrigin:          process.env.CORS_ORIGIN          || 'http://localhost:4200',
  logLevel:            process.env.LOG_LEVEL            || 'debug',

  emailHost:           process.env.EMAIL_HOST            || '',
  emailPort:           parseInt(process.env.EMAIL_PORT   || '587', 10),
  emailUser:           process.env.EMAIL_USER            || '',
  emailPassword:       process.env.EMAIL_PASSWORD        || '',
  emailFrom:           process.env.EMAIL_FROM            || 'LifeVault Reminders <chibaroshan2387@gmail.com>',

  failedLoginThreshold:     parseInt(process.env.FAILED_LOGIN_THRESHOLD || '5', 10),
  failedLoginWindowMinutes: parseInt(process.env.FAILED_LOGIN_WINDOW_MINUTES || '10', 10),
  downloadThreshold:        parseInt(process.env.DOCUMENT_DOWNLOAD_THRESHOLD || '10', 10),
  downloadWindowMinutes:    parseInt(process.env.DOCUMENT_DOWNLOAD_WINDOW_MINUTES || '5', 10),

  storageProvider:     (process.env.STORAGE_PROVIDER === 'b2' ? 'b2' : 'local') as 'local' | 'b2',
  b2Endpoint:          process.env.B2_ENDPOINT          || '',
  b2Region:            process.env.B2_REGION            || 'us-east-005',
  b2BucketName:        process.env.B2_BUCKET_NAME        || 'lifevault-documents',
  b2KeyId:             process.env.B2_KEY_ID            || '',
  b2ApplicationKey:    process.env.B2_APPLICATION_KEY   || '',
};

/** Fail fast in production or if critical configurations are missing */
export const validateConfig = (): void => {
  const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI'];
  if (process.env.NODE_ENV === 'production') {
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) {
      throw new Error(`Missing required production env vars: ${missing.join(', ')}`);
    }
  }

  if (appConfig.storageProvider === 'b2') {
    const b2Required = ['B2_ENDPOINT', 'B2_KEY_ID', 'B2_APPLICATION_KEY', 'B2_BUCKET_NAME'];
    const missingB2 = b2Required.filter((k) => !process.env[k]);
    if (missingB2.length) {
      throw new Error(`Storage provider is set to 'b2' but missing required env vars: ${missingB2.join(', ')}`);
    }
  }
};
