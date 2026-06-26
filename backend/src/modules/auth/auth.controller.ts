/**
 * auth.controller.ts — Auth HTTP Controllers
 *
 * Thin layer — only responsible for:
 *  1. Extracting validated data from req.body (Zod already validated it)
 *  2. Calling the appropriate authService method
 *  3. Returning the ApiResponse
 *  4. Passing errors to next() for the global errorHandler
 *
 * No business logic here. No bcrypt. No JWT. No DB queries.
 */
import { Request, Response, NextFunction } from 'express';
import { authService }   from './auth.service';
import { ApiResponse }   from '../../utils/ApiResponse';
import type { RegisterDto, LoginDto, RefreshDto } from './auth.validator';

// ------------------------------------------------------------------
// POST /api/v1/auth/register
// ------------------------------------------------------------------

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user account
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, password]
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongPass1!
 *                 description: Min 8 chars, uppercase, lowercase, digit, special char
 *     responses:
 *       201:
 *         description: Account created — user should now log in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto = req.body as RegisterDto;
    const result = await authService.register(dto);
    res.status(201).json(ApiResponse.success(result.message));
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// POST /api/v1/auth/login
// ------------------------------------------------------------------

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate and receive JWT tokens
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongPass1!
 *     responses:
 *       200:
 *         description: Login successful
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
 *                         user:
 *                           type: object
 *                           properties:
 *                             id:       { type: string }
 *                             fullName: { type: string }
 *                             email:    { type: string }
 *                             role:     { type: string }
 *                         accessToken:  { type: string }
 *                         refreshToken: { type: string }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid email or password
 *       403:
 *         description: Account deactivated
 *       500:
 *         description: Internal server error
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto        = req.body as LoginDto;
    const userAgent  = req.headers['user-agent'];
    const ipAddress  = req.ip;
    const result     = await authService.login(dto, userAgent, ipAddress);
    res.status(200).json(ApiResponse.success('Login successful', result));
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// POST /api/v1/auth/refresh
// ------------------------------------------------------------------

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Get a new access token using a refresh token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New access token issued
 *       401:
 *         description: Refresh token invalid, expired, or not found
 *       500:
 *         description: Internal server error
 */
export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto    = req.body as RefreshDto;
    const result = await authService.refresh(dto);
    res.status(200).json(ApiResponse.success('Token refreshed', result));
  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------------------
// POST /api/v1/auth/logout
// ------------------------------------------------------------------

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out and invalidate the refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    await authService.logout(refreshToken ?? '');
    res.status(200).json(ApiResponse.success('Logged out successfully'));
  } catch (err) {
    next(err);
  }
};
