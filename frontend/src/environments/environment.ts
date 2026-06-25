/**
 * Environment - Development
 *
 * Swapped for environment.prod.ts during `ng build --configuration production`
 * via fileReplacements in angular.json.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
  aiServiceUrl: 'http://localhost:8000',
  version: '1.0.0',
  jwtKey: 'lifevault_token',
  maxFileSizeBytes: 10 * 1024 * 1024,       // 10 MB
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
};
