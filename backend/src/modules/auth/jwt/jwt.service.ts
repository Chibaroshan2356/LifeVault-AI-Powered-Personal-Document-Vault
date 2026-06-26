/**
 * jwt.service.ts — JWT Sign & Verify Operations
 *
 * The only place in the codebase that imports 'jsonwebtoken'.
 * All other code calls this service — never jsonwebtoken directly.
 *
 * Why?
 *  If we switch algorithms (HS256 → RS256) or token libraries,
 *  only this file changes. Nothing in auth.service.ts breaks.
 *
 * Methods:
 *  signAccessToken()   — creates a short-lived access token
 *  signRefreshToken()  — creates a long-lived refresh token
 *  verifyAccessToken() — validates + decodes an access token
 *  verifyRefreshToken()— validates + decodes a refresh token
 */
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { appConfig } from '../../../config/app.config';
import { JWT_CONSTANTS } from './jwt.constants';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
  VerifiedAccessToken,
  VerifiedRefreshToken,
  TokenPair,
} from './jwt.types';
import { HttpError } from '../../../middleware/error.middleware';

/** Shared signing options applied to both token types */
const BASE_OPTIONS: jwt.SignOptions = {
  algorithm: JWT_CONSTANTS.ALGORITHM,
  issuer:    JWT_CONSTANTS.ISSUER,
  audience:  JWT_CONSTANTS.AUDIENCE,
};

class JwtService {
  /**
   * Sign an access token for the given user.
   *
   * @param userId  — MongoDB _id as string
   * @param email   — user's email address
   * @param role    — user's role (user | admin)
   */
  signAccessToken(userId: string, email: string, role: string): string {
    const payload: AccessTokenPayload = {
      sub:   userId,
      email,
      role,
      type: 'access',
    };

    return jwt.sign(payload, appConfig.jwtSecret, {
      ...BASE_OPTIONS,
      expiresIn: JWT_CONSTANTS.ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  }

  /**
   * Sign a refresh token.
   * Each refresh token gets a unique jti (JWT ID) that matches
   * the _id stored in the RefreshTokens MongoDB collection.
   * This allows individual tokens to be revoked on logout.
   *
   * @param userId — MongoDB _id as string
   * @param jti    — unique token ID (UUID v4); if omitted, one is generated
   */
  signRefreshToken(userId: string, jti: string = uuidv4()): string {
    const payload: RefreshTokenPayload = {
      sub:  userId,
      jti,
      type: 'refresh',
    };

    return jwt.sign(payload, appConfig.jwtRefreshSecret, {
      ...BASE_OPTIONS,
      expiresIn: JWT_CONSTANTS.REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  }

  /**
   * Verify and decode an access token.
   * Throws HttpError 401 if the token is invalid or expired.
   *
   * @param token — raw Bearer token from Authorization header
   */
  verifyAccessToken(token: string): VerifiedAccessToken {
    try {
      const decoded = jwt.verify(token, appConfig.jwtSecret, {
        algorithms: [JWT_CONSTANTS.ALGORITHM],
        issuer:     JWT_CONSTANTS.ISSUER,
        audience:   JWT_CONSTANTS.AUDIENCE,
      }) as VerifiedAccessToken;

      // Extra guard: reject refresh tokens used as access tokens
      if (decoded.type !== 'access') {
        throw new HttpError(401, 'Invalid token type');
      }

      return decoded;
    } catch (err) {
      if (err instanceof HttpError) throw err;
      if ((err as Error).name === 'TokenExpiredError') {
        throw new HttpError(401, 'Access token expired');
      }
      throw new HttpError(401, 'Invalid access token');
    }
  }

  /**
   * Verify and decode a refresh token.
   * Throws HttpError 401 if invalid or expired.
   *
   * @param token — raw refresh token from request body
   */
  verifyRefreshToken(token: string): VerifiedRefreshToken {
    try {
      const decoded = jwt.verify(token, appConfig.jwtRefreshSecret, {
        algorithms: [JWT_CONSTANTS.ALGORITHM],
        issuer:     JWT_CONSTANTS.ISSUER,
        audience:   JWT_CONSTANTS.AUDIENCE,
      }) as VerifiedRefreshToken;

      if (decoded.type !== 'refresh') {
        throw new HttpError(401, 'Invalid token type');
      }

      return decoded;
    } catch (err) {
      if (err instanceof HttpError) throw err;
      if ((err as Error).name === 'TokenExpiredError') {
        throw new HttpError(401, 'Refresh token expired — please log in again');
      }
      throw new HttpError(401, 'Invalid refresh token');
    }
  }
}

/** Singleton — import this instance everywhere */
export const jwtService = new JwtService();
