/**
 * Environment - Production
 *
 * Replace apiUrl and aiServiceUrl with real deployed URLs before release.
 */
export const environment = {
  production: true,
  apiUrl: 'https://api.lifevault.com/api/v1',
  aiServiceUrl: 'https://ai.lifevault.com',
  version: '1.0.0',
  jwtKey: 'lifevault_token',
  maxFileSizeBytes: 10 * 1024 * 1024,
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
};
