import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';
import { Otp } from '../models/Otp';
import { requestAuthOtpSchema, verifyAuthOtpSchema } from '../validators/authValidators';
import { getSmsProvider, generateNumericOtp } from '../services/sms/smsService';
import { hashOtp, compareOtp } from '../utils/crypto';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export async function requestAuthOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { mobile, name } = requestAuthOtpSchema.parse(req.body);

    const existingUser = await User.findOne({ mobile, isDeleted: false });
    const isNewUser = !existingUser;

    // Invalidate existing active OTPs for this mobile & purpose
    await Otp.deleteMany({ mobile, purpose: 'AUTH' });

    // Generate fresh OTP
    const rawOtp = generateNumericOtp();
    const otpHash = await hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

    await Otp.create({
      mobile,
      otpHash,
      purpose: 'AUTH',
      expiresAt,
      attempts: 0,
      maxAttempts: env.OTP_MAX_ATTEMPTS,
      isVerified: false,
    });

    const smsProvider = getSmsProvider();
    const smsResult = await smsProvider.sendOtp(mobile, rawOtp, 'AUTH');

    res.status(200).json({
      success: true,
      message: `OTP sent successfully to +91-${mobile}`,
      isNewUser,
      expiresInMinutes: env.OTP_EXPIRY_MINUTES,
      ...(smsResult.devOtp ? { devOtp: smsResult.devOtp } : {}),
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyAuthOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { mobile, otp, name } = verifyAuthOtpSchema.parse(req.body);

    const otpDoc = await Otp.findOne({
      mobile,
      purpose: 'AUTH',
      isVerified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpDoc) {
      throw new AppError('OTP has expired or is invalid. Please request a new OTP.', 400);
    }

    if (otpDoc.attempts >= otpDoc.maxAttempts) {
      await Otp.deleteOne({ _id: otpDoc._id });
      throw new AppError('Too many failed attempts. Please request a fresh OTP.', 400);
    }

    const isMatch = await compareOtp(otp, otpDoc.otpHash);
    if (!isMatch) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      const remaining = otpDoc.maxAttempts - otpDoc.attempts;
      throw new AppError(`Incorrect OTP. ${remaining} attempt(s) remaining.`, 400);
    }

    // Mark OTP as verified & clean up
    otpDoc.isVerified = true;
    await otpDoc.save();
    await Otp.deleteOne({ _id: otpDoc._id });

    // Check if user exists or create new user
    let user = await User.findOne({ mobile, isDeleted: false });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await User.create({
        mobile,
        name: name || 'QuickMart Customer',
        addresses: [],
      });
    } else if (name && (!user.name || user.name === 'QuickMart Customer')) {
      user.name = name;
      await user.save();
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id.toString(), mobile: user.mobile },
      env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      message: isNewUser ? 'Account created successfully' : 'Signed in successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        profilePhoto: user.profilePhoto,
        addresses: user.addresses,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError('User not authenticated', 401);
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        profilePhoto: user.profilePhoto,
        addresses: user.addresses,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    success: true,
    message: 'Signed out successfully.',
  });
}
