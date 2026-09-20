/**
 * blockchain.controller.ts — Blockchain Integrity API Controllers
 *
 * Endpoints:
 *  GET  /api/v1/documents/:id/integrity  — return on-chain record from MongoDB + chain
 *  POST /api/v1/documents/:id/verify     — re-hash stored file, compare with chain
 */
import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { DocumentModel }        from '../document/document.model';
import { StorageFactory }       from '../../common/storage.factory';
import { blockchainService }    from '../../common/blockchain.service';
import { ApiResponse }          from '../../utils/ApiResponse';
import { HttpError }            from '../../middleware/error.middleware';
import { logger }               from '../../utils/logger';
import { validateObjectKey }    from '../../utils/storage-key.util';

// ──────────────────────────────────────────────────────────────────────
// GET /api/v1/documents/:id/integrity
// ──────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /documents/{id}/integrity:
 *   get:
 *     summary: Get blockchain integrity record for a document
 *     tags: [Blockchain]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Integrity record returned
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document not found
 */
export const getIntegrityRecord = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id }   = req.params;
    const userId   = req.user!.sub;

    const doc = await DocumentModel.findById(id).lean();
    if (!doc)                               throw new HttpError(404, 'Document not found');
    if (doc.userId.toString() !== userId)   throw new HttpError(403, 'Forbidden');

    const integrity = doc.blockchainIntegrity;

    // Optionally enrich with live on-chain data if registered
    let onChainRecord = null;
    if (
      integrity?.verificationStatus === 'registered' ||
      integrity?.verificationStatus === 'verified'
    ) {
      onChainRecord = await blockchainService.getOnChainRecord(id);
    }

    res.status(200).json(
      ApiResponse.success('Integrity record retrieved', {
        fileHash:            integrity?.fileHash ?? null,
        verificationStatus:  integrity?.verificationStatus ?? 'not_computed',
        txHash:              integrity?.txHash ?? null,
        blockNumber:         integrity?.blockNumber ?? null,
        registeredAt:        integrity?.registeredAt ?? null,
        contractAddress:     integrity?.contractAddress ?? null,
        network:             integrity?.network ?? null,
        blockchainEnabled:   blockchainService.isEnabled(),
        onChainRecord,
      }),
    );
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────────────────────────────
// POST /api/v1/documents/:id/verify
// ──────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /documents/{id}/verify:
 *   post:
 *     summary: Verify document integrity against blockchain record
 *     description: |
 *       Re-reads the stored file from disk, computes its SHA-256 hash,
 *       and compares it against the on-chain record.
 *       Returns verified=true if the file is unchanged, false if tampered.
 *       This is a non-modifying operation (no gas required for verification).
 *     tags: [Blockchain]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 verified:    { type: boolean }
 *                 registered:  { type: boolean }
 *                 timestamp:   { type: string, format: date-time, nullable: true }
 *                 currentHash: { type: string }
 *                 storedHash:  { type: string }
 *       400:
 *         description: Blockchain not enabled or document has no hash record
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document not found
 */
export const verifyIntegrity = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.sub;

    // ── 1. Fetch document ────────────────────────────────────────
    const doc = await DocumentModel.findById(id).lean();
    if (!doc)                               throw new HttpError(404, 'Document not found');
    if (doc.userId.toString() !== userId)   throw new HttpError(403, 'Forbidden');

    const integrity = doc.blockchainIntegrity;
    if (!integrity?.fileHash) {
      throw new HttpError(400, 'This document has no blockchain integrity record (uploaded before integration was enabled)');
    }

    // ── 2. Read stored file and compute current hash ─────────────
    validateObjectKey(doc.storagePath);

    let fileBuffer: Buffer;
    try {
      const storage = StorageFactory.getService(doc.storageProvider);
      fileBuffer = await storage.get(doc.storagePath);
    } catch {
      throw new HttpError(500, 'Could not read document file from storage');
    }

    const currentHash = createHash('sha256').update(fileBuffer).digest('hex');

    // ── 3. Compare with on-chain record ──────────────────────────
    let verificationResult = {
      verified:    false,
      registered:  false,
      timestamp:   null as Date | null,
    };

    if (blockchainService.isEnabled()) {
      verificationResult = await blockchainService.verify(id, currentHash);
    } else {
      // Blockchain disabled: fall back to local hash comparison
      verificationResult = {
        verified:   currentHash === integrity.fileHash,
        registered: false,
        timestamp:  null,
      };
    }

    // ── 4. Update verification status in MongoDB ─────────────────
    const newStatus = verificationResult.verified ? 'verified' : 'tampered';
    await DocumentModel.findByIdAndUpdate(id, {
      'blockchainIntegrity.verificationStatus': newStatus,
    });

    logger.info('Document integrity verified', {
      documentId:  id,
      userId,
      verified:    verificationResult.verified,
      currentHash: currentHash.slice(0, 16) + '...',
      storedHash:  integrity.fileHash.slice(0, 16) + '...',
    });

    res.status(200).json(
      ApiResponse.success(
        verificationResult.verified ? 'Document integrity confirmed — file is authentic' : '⚠️ Integrity violation — file may have been altered',
        {
          verified:          verificationResult.verified,
          registered:        verificationResult.registered,
          timestamp:         verificationResult.timestamp,
          currentHash,
          storedHash:        integrity.fileHash,
          hashMatch:         currentHash === integrity.fileHash,
          blockchainChecked: blockchainService.isEnabled(),
          verificationStatus: newStatus,
        },
      ),
    );
  } catch (err) {
    next(err);
  }
};
