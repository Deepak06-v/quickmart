import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';
import { requestAuthOtpSchema, verifyAuthOtpSchema } from '../validators/authValidators';
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
