/**
 * requestId.middleware.ts - Request ID Injection
 *
 * Attaches a unique ID to every incoming request.
 * The ID is:
 *  - Added to the response header: X-Request-ID
 *  - Available as req.requestId throughout the request lifecycle
 *  - Included in log entries to trace a request across log lines
 *
 * Usage in logs:
 *   logger.info('Processing document', { requestId: req.requestId, documentId });
 */
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request type to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Use existing request ID if forwarded by a proxy, otherwise generate one
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.requestId = requestId;

  // Echo the ID back so clients can correlate their requests with server logs
  res.setHeader('X-Request-ID', requestId);

  next();
};
