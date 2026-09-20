/**
 * auth.routes.ts — Auth Route Definitions
 *
 * All routes prefixed with /api/v1/auth (mounted in modules/index.ts)
 *
 * Middleware chain per route:
 *   validate(Schema) → controller
 *
 * authenticate middleware is NOT applied to auth routes
 * (register, login, refresh are public endpoints).
 * logout requires the refresh token in the body — validated there.
 */

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication — register, login, refresh, logout
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate }   from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/authenticate.middleware';
import { register, login, refresh, logout } from './auth.controller';
import { RegisterSchema, LoginSchema, RefreshSchema } from './auth.validator';

export const authRouter = Router();

/** Dedicated rate limiter for login to prevent brute force */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      process.env.NODE_ENV === 'development' ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message:  { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
});

// POST /api/v1/auth/register
authRouter.post('/register', validate(RegisterSchema), register);

// POST /api/v1/auth/login
authRouter.post('/login', loginLimiter, validate(LoginSchema), login);

// POST /api/v1/auth/refresh
authRouter.post('/refresh', validate(RefreshSchema), refresh);

// POST /api/v1/auth/logout — requires access token + refresh token in body
authRouter.post('/logout', authenticate, logout);

