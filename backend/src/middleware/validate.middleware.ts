/**
 * validate.middleware.ts — Zod Request Validation Middleware
 *
 * Wraps any Zod schema into an Express middleware.
 * On success: attaches parsed+typed body to req.body and calls next().
 * On failure: returns 400 with field-level errors in ApiResponse format.
 *
 * Usage:
 *   import { validate } from '../middleware/validate.middleware';
 *   import { RegisterSchema } from './auth.validator';
 *
 *   router.post('/register', validate(RegisterSchema), register);
 */
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ApiResponse } from '../utils/ApiResponse';

export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Convert Zod issues → ApiResponse ValidationError format
      const errors = result.error.issues.map((issue) => ({
        field:   issue.path.join('.') || 'body',
        message: issue.message,
      }));

      res.status(400).json(ApiResponse.error('Validation failed', errors));
      return;
    }

    // Replace req.body with the parsed (and possibly transformed) value
    // e.g. email is lowercased by Zod before reaching the service
    req.body = result.data;
    next();
  };
