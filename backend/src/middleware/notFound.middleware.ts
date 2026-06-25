/**
 * notFound.middleware.ts - 404 Handler
 *
 * Catches all requests that don't match any registered route.
 * Registered after all routes in app.ts, before errorHandler.
 */
import { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json(
    ApiResponse.error(`Cannot ${req.method} ${req.originalUrl}`),
  );
};
