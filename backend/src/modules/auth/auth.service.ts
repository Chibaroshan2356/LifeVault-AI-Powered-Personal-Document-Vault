/**
 * auth.service.ts — Authentication Business Logic
 *
 * Responsibilities:
 *  register()  — validate uniqueness, hash password, create user
 *  login()     — verify credentials, issue token pair, store refresh token
 *  refresh()   — verify stored refresh token, issue new access token
 *  logout()    — delete refresh token from DB (server-side invalidation)
 *
 * Dependencies:
 *  UserModel         — MongoDB user collection
 *  RefreshTokenModel — MongoDB refresh token collection
 *  jwtService        — sign + verify JWTs
 *  bcryptjs          — password hashing
 *
 * This service has no knowledge of Express (no req/res).
 * It only throws HttpError — the controller catches and forwards to errorHandler.
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { UserModel, IUserLean }       from '../user/user.model';
import { RefreshTokenModel }          from './refresh-token.model';
import { jwtService }                 from './jwt/jwt.service';
import { JWT_CONSTANTS }              from './jwt/jwt.constants';
import { HttpError }                  from '../../middleware/error.middleware';
import { logger }                     from '../../utils/logger';
import type { RegisterDto, LoginDto, RefreshDto } from './auth.validator';
import type { LoginResult, RefreshResult }        from './auth.types';

/** Number of bcrypt salt rounds — 12 is a good balance of security vs speed */
const SALT_ROUNDS = 12;

class AuthService {
  // ------------------------------------------------------------------
  // Register
  // ------------------------------------------------------------------

  /**
   * Creates a new user account.
   * Does NOT return tokens — the user must explicitly log in after registration.
   *
   * @throws HttpError 409 if email already exists
   */
  async register(dto: RegisterDto): Promise<{ message: string }> {
    // 1. Check uniqueness
    const existing = await UserModel.findOne({ email: dto.email }).lean();
    if (existing) {
      throw new HttpError(409, 'An account with this email already exists');
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // 3. Create user
    await UserModel.create({
      fullName:  dto.fullName,
      email:     dto.email,
      passwordHash,
    });

    logger.info('New user registered', { email: dto.email });

    return { message: 'Registration successful. Please log in.' };
  }

  // ------------------------------------------------------------------
  // Login
  // ------------------------------------------------------------------

  /**
   * Authenticates a user and returns a token pair.
   *
   * @throws HttpError 401 for invalid credentials (intentionally vague — no enumeration)
   * @throws HttpError 403 if the account is deactivated
   */
  async login(dto: LoginDto, userAgent?: string, ipAddress?: string): Promise<LoginResult> {
    // 1. Find user — explicitly select passwordHash (excluded by default)
    const user = await UserModel.findOne({ email: dto.email }).select('+passwordHash');
    if (!user) {
      // Same error message as wrong password — prevents email enumeration
      throw new HttpError(401, 'Invalid email or password');
    }

    // 2. Check account is active
    if (!user.isActive) {
      throw new HttpError(403, 'Your account has been deactivated. Please contact support.');
    }

    // 3. Verify password
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new HttpError(401, 'Invalid email or password');
    }

    // 4. Sign tokens
    const userId = (user._id as mongoose.Types.ObjectId).toString();
    const accessToken  = jwtService.signAccessToken(userId, user.email, user.role);
    const refreshToken = jwtService.signRefreshToken(userId);

    // 5. Decode to get the jti (UUID) so we can store its hash
    const decoded     = jwtService.verifyRefreshToken(refreshToken);
    const tokenHash   = await bcrypt.hash(decoded.jti, 10);
    const expiresAt   = new Date(Date.now() + ms(JWT_CONSTANTS.REFRESH_EXPIRES_IN));

    // 6. Store refresh token hash in DB
    await RefreshTokenModel.create({
      userId:    user._id,
      tokenHash,
      expiresAt,
      userAgent,
      ipAddress,
    });

    // 7. Update lastLoginAt
    await UserModel.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

    logger.info('User logged in', { userId, email: user.email });

    // 8. Return — passwordHash never included
    const safeUser = user.toObject() as unknown as IUserLean;
    delete (safeUser as unknown as Record<string, unknown>).passwordHash;

    return { user: safeUser, accessToken, refreshToken };
  }

  // ------------------------------------------------------------------
  // Refresh
  // ------------------------------------------------------------------

  /**
   * Issues a new access token if the refresh token is valid and exists in DB.
   *
   * @throws HttpError 401 if token is invalid, expired, or not found in DB
   */
  async refresh(dto: RefreshDto): Promise<RefreshResult> {
    // 1. Verify JWT signature + expiry
    const decoded = jwtService.verifyRefreshToken(dto.refreshToken);

    // 2. Check the token exists in DB
    //    Find all active tokens for this user and check hashes
    const storedTokens = await RefreshTokenModel.find({
      userId: decoded.sub,
      expiresAt: { $gt: new Date() },
    });

    let tokenRecord = null;
    for (const stored of storedTokens) {
      const match = await bcrypt.compare(decoded.jti, stored.tokenHash);
      if (match) {
        tokenRecord = stored;
        break;
      }
    }

    if (!tokenRecord) {
      throw new HttpError(401, 'Refresh token not found — please log in again');
    }

    // 3. Check user still exists and is active
    const user = await UserModel.findById(decoded.sub);
    if (!user || !user.isActive) {
      throw new HttpError(401, 'Account not found or deactivated');
    }

    // 4. Issue new access token
    const accessToken = jwtService.signAccessToken(decoded.sub, user.email, user.role);

    logger.info('Access token refreshed', { userId: decoded.sub });

    return { accessToken };
  }

  // ------------------------------------------------------------------
  // Logout
  // ------------------------------------------------------------------

  /**
   * Deletes the refresh token from DB — server-side invalidation.
   * Even if a client retains the token, it will fail the DB check on refresh.
   *
   * @throws HttpError 401 if token is invalid (already deleted or never existed)
   */
  async logout(refreshToken: string): Promise<void> {
    let decoded;
    try {
      decoded = jwtService.verifyRefreshToken(refreshToken);
    } catch {
      // If the token is already expired/invalid, treat as already logged out
      return;
    }

    // Find and delete matching stored token
    const storedTokens = await RefreshTokenModel.find({ userId: decoded.sub });
    for (const stored of storedTokens) {
      const match = await bcrypt.compare(decoded.jti, stored.tokenHash);
      if (match) {
        await RefreshTokenModel.deleteOne({ _id: stored._id });
        break;
      }
    }

    logger.info('User logged out', { userId: decoded.sub });
  }
}

// ------------------------------------------------------------------
// Helper: parse duration string → milliseconds
// e.g. '30d' → 30 * 24 * 60 * 60 * 1000
// ------------------------------------------------------------------
function ms(duration: string): number {
  const units: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  return parseInt(match[1], 10) * units[match[2]];
}

export const authService = new AuthService();
