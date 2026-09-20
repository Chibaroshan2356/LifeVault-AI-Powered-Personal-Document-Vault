/**
 * reminder.model.ts — Smart Reminder Mongoose Schema
 *
 * One reminder per document (unique on documentId).
 * Supports In-App, Browser, and Email notification channels with per-channel status tracking.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

export type ReminderEventType =
  | 'insurance_expiry'
  | 'warranty_expiry'
  | 'guarantee_expiry'
  | 'payment_due'
  | 'subscription_renewal'
  | 'vehicle_renewal'
  | 'certificate_expiry'
  | 'passport_expiry'
  | 'visa_expiry'
  | 'custom';

export interface IChannelExecutionStatus {
  sent:    boolean;
  sentAt?: Date;
  status:  'pending' | 'sent' | 'failed' | 'disabled';
  error?:  string;
}

export interface IReminderInterval {
  daysBefore:     number;
  enabled:        boolean;
  sentAt?:        Date;
  channelStatus?: {
    inApp?:   IChannelExecutionStatus;
    browser?: IChannelExecutionStatus;
    email?:   IChannelExecutionStatus;
  };
}

export interface IReminderChannels {
  inApp:   boolean;
  browser: boolean;
  email:   boolean;
}

export interface IReminder extends Document {
  documentId:       mongoose.Types.ObjectId;
  userId:           mongoose.Types.ObjectId;
  eventType:        ReminderEventType;
  eventLabel:       string;              // human-readable: "Insurance Renewal"
  eventDate:        Date;
  intervals:        IReminderInterval[];
  notificationTime: string;              // "11:35" (HH:mm)
  timezone:         string;              // "Asia/Kolkata"
  channels:         IReminderChannels;
  enabled:          boolean;
  isManual:         boolean;             // true = user-added, false = AI-detected
  lowConfidence:    boolean;             // flag if OCR confidence was < 70%
  createdAt:        Date;
  updatedAt:        Date;
}

const ChannelStatusSchema = new Schema<IChannelExecutionStatus>(
  {
    sent:   { type: Boolean, default: false },
    sentAt: { type: Date },
    status: { type: String, enum: ['pending', 'sent', 'failed', 'disabled'], default: 'pending' },
    error:  { type: String },
  },
  { _id: false },
);

const ReminderIntervalSchema = new Schema<IReminderInterval>(
  {
    daysBefore:    { type: Number, required: true },
    enabled:       { type: Boolean, default: true },
    sentAt:        { type: Date },
    channelStatus: {
      inApp:   { type: ChannelStatusSchema, default: () => ({ status: 'pending', sent: false }) },
      browser: { type: ChannelStatusSchema, default: () => ({ status: 'pending', sent: false }) },
      email:   { type: ChannelStatusSchema, default: () => ({ status: 'pending', sent: false }) },
    },
  },
  { _id: false },
);

const ReminderSchema = new Schema<IReminder>(
  {
    documentId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Document',
      required: true,
      unique:   true,
      index:    true,
    },
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    eventType: {
      type:     String,
      required: true,
      default:  'custom',
    },
    eventLabel: {
      type:     String,
      required: true,
    },
    eventDate: {
      type:     Date,
      required: true,
      index:    true,
    },
    intervals: {
      type:    [ReminderIntervalSchema],
      default: [
        { daysBefore: 30, enabled: true },
        { daysBefore: 15, enabled: true },
        { daysBefore: 7,  enabled: true },
        { daysBefore: 1,  enabled: true },
      ],
    },
    notificationTime: {
      type:    String,
      default: '09:00',
    },
    timezone: {
      type:    String,
      default: 'Asia/Kolkata',
    },
    channels: {
      inApp:   { type: Boolean, default: true },
      browser: { type: Boolean, default: true },
      email:   { type: Boolean, default: false },
    },
    enabled: {
      type:    Boolean,
      default: true,
      index:   true,
    },
    isManual: {
      type:    Boolean,
      default: false,
    },
    lowConfidence: {
      type:    Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const ReminderModel: Model<IReminder> =
  mongoose.model<IReminder>('Reminder', ReminderSchema);
