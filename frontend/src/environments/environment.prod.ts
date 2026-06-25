/**
 * Environment Configuration - Production
 *
 * Purpose: Contains environment-specific variables for the production environment.
 * This file replaces environment.ts during `ng build --configuration production`.
 *
 * IMPORTANT: Replace placeholder values with actual production values before deployment.
 * Use CI/CD environment variables to inject these values securely.
 */

export const environment = {
  /**
   * Production flag - enables production optimizations.
   */
  production: true,

  /**
   * Production backend API URL.
   * Replace with your actual production API URL.
   */
  apiUrl: 'https://api.lifevault.com/api',

  /**
   * Production AI service URL.
   * Replace with your actual AI service URL.
   */
  aiServiceUrl: 'https://ai.lifevault.com',

  /**
   * Application version.
   */
  version: '1.0.0',

  /**
   * Disable verbose logging in production.
   */
  enableLogging: false,

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
