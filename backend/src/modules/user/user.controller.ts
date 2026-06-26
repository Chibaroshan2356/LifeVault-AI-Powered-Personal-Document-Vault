/**
 * user.controller.ts — User HTTP Controllers
 *
 * Currently handles:
 *  GET /api/v1/users/profile — return authenticated user's profile
 *
 * More endpoints added in Sprint 2 (update profile, change password).
 */
import { Request, Response, NextFunction } from 'express';
import { UserModel }   from './user.model';
import { ApiResponse } from '../../utils/ApiResponse';
import { HttpError }   from '../../middleware/error.middleware';

// ------------------------------------------------------------------
// GET /api/v1/users/profile
// ------------------------------------------------------------------

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get the authenticated user's profile
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         _id:             { type: string }
 *                         fullName:        { type: string }
 *                         email:           { type: string }
 *                         role:            { type: string }
 *                         isEmailVerified: { type: boolean }
 *                         lastLoginAt:     { type: string, format: date-time }
 *                         avatar:          { type: string, nullable: true }
 *                         createdAt:       { type: string, format: date-time }
 *       401:
 *         description: Unauthorized — missing or invalid token
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // req.user is set by authenticate middleware
    const userId = req.user?.sub;
    if (!userId) throw new HttpError(401, 'Unauthorized');

    const user = await UserModel.findById(userId).lean();
    if (!user) throw new HttpError(404, 'User not found');

    res.status(200).json(ApiResponse.success('Profile retrieved', user));
  } catch (err) {
    next(err);
  }
};
