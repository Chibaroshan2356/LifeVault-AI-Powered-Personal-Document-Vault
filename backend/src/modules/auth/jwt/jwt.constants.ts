/**
 * jwt.constants.ts — JWT Configuration Constants
 *
 * Centralises all JWT-related configuration.
 * Values are read from environment variables; defaults are only
 * used in development — production requires explicit env vars
 * (validated by validateConfig() at startup).
 *
 * Access token:  short-lived (15 min) — sent on every API request
 * Refresh token: long-lived  (30 days) — only sent to /auth/refresh
 */

export const JWT_CONSTANTS = {
  /** Algorithm — HS256 is sufficient; upgrade to RS256 for multi-service setups */
  ALGORITHM: 'HS256' as const,

  /** Access token lifetime — short to limit damage if stolen */
  ACCESS_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '15m',

  /** Refresh token lifetime — long enough to avoid frequent logins */
  REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',

  /** Issuer claim — identifies this server as the token source */
  ISSUER: 'lifevault-api',

  /** Audience claim — identifies the intended recipient */
  AUDIENCE: 'lifevault-client',
} as const;
