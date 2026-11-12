import { env } from '../config/env';
import { Otp, OtpPurpose } from '../models/Otp';
import { getSmsProvider, generateNumericOtp } from './sms/smsService';
import { hashOtp, compareOtp } from '../utils/crypto';
import { AppError } from '../middleware/errorHandler';

export interface IssueOtpResult {
  expiresInMinutes: number;
  devOtp?: string;
  messageId?: string;
}

/**
 * Generates a fresh OTP, dispatches it via the configured SMS provider,
 * and persists the hashed OTP ONLY if the provider accepted the request.
 */
export async function issueAndSendOtp(
  mobile: string,
  purpose: OtpPurpose,
  payloadHash?: string
): Promise<IssueOtpResult> {
  const rawOtp = generateNumericOtp();
  const otpHash = await hashOtp(rawOtp);
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

  const smsProvider = getSmsProvider();
  const smsResult = await smsProvider.sendOtp(mobile, rawOtp, purpose);

  if (!smsResult.success) {
    throw new AppError(
      smsResult.error || 'Unable to send OTP. Please try again.',
      smsResult.statusCode || 503,
      smsResult.code || 'SMS_SEND_FAILED'
    );
  }

  // Only invalidate prior OTPs and persist the new OTP after provider acceptance
  await Otp.deleteMany({ mobile, purpose });
  await Otp.create({
    mobile,
    otpHash,
    purpose,
    payloadHash,
    expiresAt,
    attempts: 0,
    maxAttempts: env.OTP_MAX_ATTEMPTS,
    isVerified: false,
  });

  return {
    expiresInMinutes: env.OTP_EXPIRY_MINUTES,
    devOtp: smsResult.devOtp,
    messageId: smsResult.messageId,
  };
}

/**
 * Verifies an OTP for a specific mobile and purpose, enforces max attempts,
 * and consumes it so it cannot be reused.
 */
export async function verifyAndConsumeOtp(
  mobile: string,
  otp: string,
  purpose: OtpPurpose,
  expiredMessage: string = 'OTP has expired or is invalid. Please request a new OTP.'
): Promise<void> {
  const otpDoc = await Otp.findOne({
    mobile,
    purpose,
    isVerified: false,
    expiresAt: { $gt: new Date() },
  });

  if (!otpDoc) {
    throw new AppError(expiredMessage, 400);
  }

  if (otpDoc.attempts >= otpDoc.maxAttempts) {
    await Otp.deleteOne({ _id: otpDoc._id });
    throw new AppError('Too many failed attempts. Please request a fresh OTP.', 400);
  }

  const isMatch = await compareOtp(otp, otpDoc.otpHash);
  if (!isMatch) {
    otpDoc.attempts += 1;
    if (otpDoc.attempts >= otpDoc.maxAttempts) {
      await Otp.deleteOne({ _id: otpDoc._id });
      throw new AppError('Too many failed attempts. Please request a fresh OTP.', 400);
    }
    await otpDoc.save();
    const remaining = otpDoc.maxAttempts - otpDoc.attempts;
    throw new AppError(`Incorrect OTP. ${remaining} attempt(s) remaining.`, 400);
  }

  otpDoc.isVerified = true;
  await otpDoc.save();
  await Otp.deleteOne({ _id: otpDoc._id });
}
