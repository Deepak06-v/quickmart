import mongoose, { Schema, Document } from 'mongoose';

export type OtpPurpose = 'AUTH' | 'ORDER_CONFIRMATION' | 'ACCOUNT_DELETION';

export interface IOtp extends Document {
  mobile: string;
  otpHash: string;
  purpose: OtpPurpose;
  payloadHash?: string; // Optional metadata verification (e.g. order summary hash)
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  isVerified: boolean;
  createdAt: Date;
}

const OtpSchema = new Schema<IOtp>(
  {
    mobile: { type: String, required: true, trim: true, index: true },
    otpHash: { type: String, required: true },
    purpose: {
      type: String,
      required: true,
      enum: ['AUTH', 'ORDER_CONFIRMATION', 'ACCOUNT_DELETION'],
      index: true,
    },
    payloadHash: { type: String },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // MongoDB TTL auto-cleanup
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    isVerified: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const Otp = mongoose.model<IOtp>('Otp', OtpSchema);
