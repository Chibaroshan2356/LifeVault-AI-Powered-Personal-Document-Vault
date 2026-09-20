/**
 * security.controller.ts — Security & Audit Log Controller
 */
import { Request, Response, NextFunction } from 'express';
import { securityAuditService } from './security-audit.service';
import { ApiResponse } from '../../utils/ApiResponse';

export const getUserSecurityActivity = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.sub;
    const page   = parseInt(req.query.page as string || '1', 10);
    const limit  = parseInt(req.query.limit as string || '20', 10);

    const result = await securityAuditService.getUserActivity(userId, page, limit);

    res.status(200).json(
      ApiResponse.success('Security activity log retrieved', result.events, {
        page,
        limit,
        total:      result.total,
        totalPages: result.totalPages,
      }),
    );
  } catch (err) {
    next(err);
  }
};
