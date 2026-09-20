/**
 * blockchain.routes.ts — Blockchain Integrity Route Definitions
 *
 * All routes require JWT authentication.
 * Routes are mounted under /api/v1/documents/:id via modules/index.ts.
 */

/**
 * @swagger
 * tags:
 *   name: Blockchain
 *   description: Document blockchain integrity verification
 */
import { Router }       from 'express';
import { authenticate } from '../../middleware/authenticate.middleware';
import {
  getIntegrityRecord,
  verifyIntegrity,
} from './blockchain.controller';

export const blockchainRouter = Router({ mergeParams: true });

// All blockchain routes require a valid JWT
blockchainRouter.use(authenticate);

// GET  /api/v1/documents/:id/integrity  — retrieve on-chain record
blockchainRouter.get('/integrity', getIntegrityRecord);

// POST /api/v1/documents/:id/verify     — re-hash file and verify against chain
blockchainRouter.post('/verify', verifyIntegrity);
