/**
 * security.routes.ts — Security & Theft Protection Routes
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.middleware';
import { getUserSecurityActivity } from './security.controller';

export const securityRouter = Router();

securityRouter.use(authenticate);

// GET /api/v1/security/activity — returns authenticated user's own security audit history
securityRouter.get('/activity', getUserSecurityActivity);
