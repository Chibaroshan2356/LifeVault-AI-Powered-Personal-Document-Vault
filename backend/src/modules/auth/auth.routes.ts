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
import { validate }   from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/authenticate.middleware';
import { register, login, refresh, logout } from './auth.controller';
import { RegisterSchema, LoginSchema, RefreshSchema } from './auth.validator';

export const authRouter = Router();

// POST /api/v1/auth/register
authRouter.post('/register', validate(RegisterSchema), register);

// POST /api/v1/auth/login
authRouter.post('/login', validate(LoginSchema), login);

// POST /api/v1/auth/refresh
authRouter.post('/refresh', validate(RefreshSchema), refresh);

// POST /api/v1/auth/logout — requires access token + refresh token in body
authRouter.post('/logout', authenticate, logout);
