import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';
import {
  requestAuthOtpSchema,
  verifyAuthOtpSchema,
  requestPublicDeleteAccountOtpSchema,
  confirmPublicDeleteAccountSchema,
} from '../validators/authValidators';
import { issueAndSendOtp, verifyAndConsumeOtp } from '../services/otpService';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export async function requestAuthOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { mobile } = requestAuthOtpSchema.parse(req.body);

    const existingUser = await User.findOne({ mobile, isDeleted: false });
    const isNewUser = !existingUser;

    const otpResult = await issueAndSendOtp(mobile, 'AUTH');

    res.status(200).json({
      success: true,
      message: `OTP request accepted for +91-${mobile}`,
      isNewUser,
      expiresInMinutes: otpResult.expiresInMinutes,
      ...(otpResult.devOtp ? { devOtp: otpResult.devOtp } : {}),
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyAuthOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { mobile, otp, name } = verifyAuthOtpSchema.parse(req.body);

    await verifyAndConsumeOtp(mobile, otp, 'AUTH');

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

/**
 * Web-based public account deletion Step 1: Request OTP for registered mobile.
 */
export async function requestPublicDeleteAccountOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { mobile } = requestPublicDeleteAccountOtpSchema.parse(req.body);

    const user = await User.findOne({ mobile, isDeleted: false });
    if (!user) {
      // Return 200 with standard response to prevent phone enumeration
      res.status(200).json({
        success: true,
        message: `If an active account exists for +91-${mobile}, an OTP has been sent.`,
        expiresInMinutes: 5,
      });
      return;
    }

    const otpResult = await issueAndSendOtp(mobile, 'ACCOUNT_DELETION');

    res.status(200).json({
      success: true,
      message: `Account deletion OTP sent to +91-${mobile}`,
      expiresInMinutes: otpResult.expiresInMinutes,
      ...(otpResult.devOtp ? { devOtp: otpResult.devOtp } : {}),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Web-based public account deletion Step 2: Verify OTP and delete/anonymize user account.
 */
export async function confirmPublicDeleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { mobile, otp } = confirmPublicDeleteAccountSchema.parse(req.body);

    await verifyAndConsumeOtp(
      mobile,
      otp,
      'ACCOUNT_DELETION',
      'Verification OTP has expired or is invalid.'
    );

    const user = await User.findOne({ mobile, isDeleted: false });
    if (!user) {
      throw new AppError('No active account found for this mobile number.', 404);
    }

    // Anonymize and mark user deleted for regulatory data compliance
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.name = 'Deleted Customer';
    user.mobile = `deleted_${Date.now()}_${user.mobile}`;
    user.addresses = [];
    user.profilePhoto = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Your account and personal data have been permanently deleted.',
    });
  } catch (error) {
    next(error);
  }
}
