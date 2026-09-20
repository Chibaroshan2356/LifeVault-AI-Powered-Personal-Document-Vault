/**
 * security-audit.model.ts — Security Audit Log Schema
 *
 * Persists security events for authentication, document access, and suspicious activity.
 * PRIVACY RULES:
 *  - NEVER store passwords, secrets, or JWT tokens.
 *  - NEVER store document text, OCR payloads, or sensitive PII (Aadhaar/PAN/passports).
 */
import mongoose, { Schema, Document, Model } from 'mongoose';
import { SecurityAction, SecurityStatus } from './security.types';

export interface ISecurityAudit extends Document {
  userId?:      mongoose.Types.ObjectId;
  documentId?:  mongoose.Types.ObjectId;
  action:       SecurityAction;
  status:       SecurityStatus;
  ipAddress?:   string;
  userAgent?:   string;
  details?:     string;
  createdAt:    Date;
  updatedAt:    Date;
}

const SecurityAuditSchema = new Schema<ISecurityAudit>(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: false,
      index:    true,
    },
    documentId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Document',
      required: false,
      index:    true,
    },
    action: {
      type:     String,
      enum:     Object.values(SecurityAction),
      required: true,
      index:    true,
    },
    status: {
      type:     String,
      enum:     Object.values(SecurityStatus),
      required: true,
      default:  SecurityStatus.SUCCESS,
    },
    ipAddress: {
      type:     String,
      required: false,
      trim:     true,
    },
    userAgent: {
      type:     String,
      required: false,
      trim:     true,
      maxlength: 300,
    },
    details: {
      type:      String,
      required:  false,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Indexes for fast per-user timeline & IP-based detection queries
SecurityAuditSchema.index({ userId: 1, createdAt: -1 });
SecurityAuditSchema.index({ ipAddress: 1, action: 1, createdAt: -1 });
SecurityAuditSchema.index({ action: 1, createdAt: -1 });

export const SecurityAuditModel: Model<ISecurityAudit> =
  mongoose.model<ISecurityAudit>('SecurityAudit', SecurityAuditSchema);
