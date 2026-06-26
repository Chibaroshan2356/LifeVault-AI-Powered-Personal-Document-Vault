/**
 * user.routes.ts — User Route Definitions
 *
 * All routes prefixed with /api/v1/users (mounted in modules/index.ts)
 * All user routes require authentication.
 */

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile management
 */
import { Router }       from 'express';
import { authenticate } from '../../middleware/authenticate.middleware';
import { getProfile }   from './user.controller';

export const userRouter = Router();

// All user routes are protected
userRouter.use(authenticate);

// GET /api/v1/users/profile
userRouter.get('/profile', getProfile);
