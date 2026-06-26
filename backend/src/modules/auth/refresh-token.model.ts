/**
 * refresh-token.model.ts — RefreshToken Mongoose Schema
 *
 * Collection: refreshtokens
 *
 * Why store refresh tokens in MongoDB?
 *  If tokens only exist in the client, logout is just "delete from localStorage" —
 *  a stolen token remains valid until it expires (30 days).
 *
 *  By storing them here:
 *  - Logout = DELETE the token from DB → stolen tokens immediately useless
 *  - Multiple device support: one user can have many valid refresh tokens
 *  - Token rotation (Sprint 2+): old token deleted, new one issued atomically
 *
 * Security note:
 *  We store a HASH of the refresh token, not the raw value.
 *  If the DB is compromised, attackers get hashes — not usable tokens.
 *  The hash is verified by hashing the incoming token and comparing.
 *
 * TTL index:
 *  MongoDB automatically deletes expired documents via the expiresAt TTL index.
 *  No cron job needed to clean up expired tokens.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRefreshToken extends Document {
  userId:     mongoose.Types.ObjectId;
  tokenHash:  string;   // bcrypt hash of the raw refresh token
  expiresAt:  Date;
  createdAt:  Date;
  userAgent?: string;   // optional: browser/device info for multi-device management
  ipAddress?: string;   // optional: for audit logging
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,   // fast lookup of all tokens for a user (logout all devices)
    },

    tokenHash: {
      type:     String,
      required: true,
    },

    expiresAt: {
      type:     Date,
      required: true,
    },

    userAgent: {
      type: String,
    },

    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ------------------------------------------------------------------
// TTL Index — MongoDB auto-deletes expired tokens
// ------------------------------------------------------------------

/**
 * expireAfterSeconds: 0 means "delete at the exact expiresAt datetime".
 * MongoDB checks every 60 seconds, so deletion may be slightly delayed —
 * acceptable for auth tokens.
 */
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel: Model<IRefreshToken> = mongoose.model<IRefreshToken>(
  'RefreshToken',
  RefreshTokenSchema,
);
