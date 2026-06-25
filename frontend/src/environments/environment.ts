/**
 * Environment Configuration - Development
 *
 * Purpose: Contains environment-specific variables for the development environment.
 * This file is used when running `ng serve` or `ng build` without production flag.
 *
 * Usage: Import environment variables in services and components like:
 *   import { environment } from '@environments/environment';
 *
 * Note: Never commit sensitive values - use environment variables in CI/CD pipelines.
 */

export const environment = {
  /**
   * Flag indicating whether this is a production build.
   * Used to enable/disable features and logging.
   */
  production: false,

  /**
   * Base URL for the Express.js backend API.
   * All HTTP requests will be prefixed with this URL.
   */
  apiUrl: 'http://localhost:3000/api',

  /**
   * Base URL for the Python FastAPI AI service.
   * Used for OCR and document intelligence requests.
   */
  aiServiceUrl: 'http://localhost:8000',

  /**
   * Application version - used for cache busting and display.
   */
  version: '1.0.0',

  /**
   * Enable verbose logging in development mode.
   */
  enableLogging: true,

  /**
   * JWT storage key name in localStorage.
   */
  jwtStorageKey: 'lifevault_token',

  /**
   * Maximum file upload size in bytes (10MB).
   */
  maxFileSize: 10 * 1024 * 1024,

  /**
   * Supported file types for document upload.
   */
  supportedFileTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
};
