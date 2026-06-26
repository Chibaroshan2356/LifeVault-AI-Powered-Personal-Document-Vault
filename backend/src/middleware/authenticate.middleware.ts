/**
 * authenticate.middleware.ts — JWT Authentication Middleware
 *
 * Extracts the Bearer token from the Authorization header,
 * verifies it with jwtService, and attaches the decoded payload
 * to req.user for use in protected controllers.
 *
 * Usage:
 *   router.get('/profile', authenticate, getProfile);
 *
 * On failure: throws HttpError 401 — caught by global errorHandler.
 */
import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../modules/auth/jwt/jwt.service';
import { HttpError }  from './error.middleware';
import type { VerifiedAccessToken } from '../modules/auth/jwt/jwt.types';

// Extend the Express Request type to include the verified user payload
declare global {
  namespace Express {
    interface Request {
      user?: VerifiedAccessToken;
    }
  }
}

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Authorization header missing or malformed');
  }

  const token = authHeader.slice(7); // remove 'Bearer '
  const decoded = jwtService.verifyAccessToken(token); // throws 401 if invalid

  req.user = decoded;
  next();
};
