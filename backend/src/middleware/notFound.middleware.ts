/**
 * notFound.middleware.ts - 404 Not Found Handler
 *
 * Purpose: Catches all requests to routes that don't exist.
 * Must be registered after all other routes.
 *
 * Usage in app.ts:
 *   app.use('/api', apiRouter);
 *   app.use(notFoundHandler);  // After all routes
 *   app.use(errorHandler);      // Error handler must be last
 */

import { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';

/**
 * 404 Not Found middleware handler.
 * Catches all requests that didn't match any route.
 *
 * @param req - Express request object
 * @param res - Express response object
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json(
    ApiResponse.error(
      `Cannot ${req.method} ${req.originalUrl} - Route not found`
    )
  );
};
