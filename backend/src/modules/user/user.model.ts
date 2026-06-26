/**
 * user.model.ts — User Mongoose Schema
 *
 * Collection: users
 *
 * Design decisions:
 *  - passwordHash has select: false — never returned unless explicitly requested
 *  - email is stored lowercase (pre-save middleware) to avoid case-sensitive duplication
 *  - role defaults to 'user' — 'admin' is assigned manually or via migration
 *  - isActive enables soft delete (deactivate without data loss)
 *  - lastLoginAt is updated by auth.service on every successful login
 *  - timestamps: true auto-manages createdAt / updatedAt
 */
import mongoose, { Schema, Document, Model } from 'mongoose';
import { UserRole } from '../../common/enums';

/** TypeScript interface for a User document returned from MongoDB */
export interface IUser extends Document {
  fullName:         string;
  email:            string;
  passwordHash:     string;   // bcrypt hash — never plain text
  role:             UserRole;
  isActive:         boolean;
  isEmailVerified:  boolean;
  lastLoginAt:      Date | null;
  avatar:           string | null;
  createdAt:        Date;
  updatedAt:        Date;
}

/** Lean version of IUser — for read-only operations via .lean() */
export interface IUserLean {
  _id:              string;
  fullName:         string;
  email:            string;
  role:             UserRole;
  isActive:         boolean;
  isEmailVerified:  boolean;
  lastLoginAt:      Date | null;
  avatar:           string | null;
  createdAt:        Date;
  updatedAt:        Date;
}

const UserSchema = new Schema<IUser>(
  {
    fullName: {
      type:     String,
      required: [true, 'Full name is required'],
      trim:     true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },

    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,   // always stored as lowercase
      trim:      true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },

    passwordHash: {
      type:     String,
      required: [true, 'Password hash is required'],
      select:   false,   // ← NEVER returned in queries unless .select('+passwordHash')
    },

    role: {
      type:    String,
      enum:    Object.values(UserRole),
      default: UserRole.USER,
    },

    isActive: {
      type:    Boolean,
      default: true,
    },

    isEmailVerified: {
      type:    Boolean,
      default: false,
    },

    lastLoginAt: {
      type:    Date,
      default: null,
    },

    avatar: {
      type:    String,
      default: null,
    },
  },
  {
    timestamps: true,    // auto-manages createdAt + updatedAt
    versionKey: false,   // removes __v field from documents
  },
);

// ------------------------------------------------------------------
// Indexes
// ------------------------------------------------------------------

/**
 * email index: unique constraint + fast login lookups.
 * Defined in schema options above via unique: true,
 * but we add a text index for case-insensitive search support.
 */
UserSchema.index({ email: 1 }, { unique: true });

// ------------------------------------------------------------------
// Instance methods
// ------------------------------------------------------------------

/**
 * toSafeObject: returns user data safe to include in API responses.
 * passwordHash is always excluded.
 */
UserSchema.methods.toSafeObject = function (): IUserLean {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

export const UserModel: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
