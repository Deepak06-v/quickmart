import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { User } from '../models/User';
import { Otp } from '../models/Otp';
import { getSmsProvider, generateNumericOtp } from '../services/sms/smsService';
import { hashOtp, compareOtp } from '../utils/crypto';
import { env } from '../config/env';
import {
  updateProfileSchema,
  addAddressSchema,
  confirmDeleteAccountSchema,
} from '../validators/profileValidators';
import { AppError } from '../middleware/errorHandler';

/**
 * Get profile data of the logged-in customer.
 */
export async function getProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        profilePhoto: user.profilePhoto,
        addresses: user.addresses,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update profile details (e.g. name).
 */
export async function updateProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const { name } = updateProfileSchema.parse(req.body);

    if (name) {
      user.name = name;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
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

/**
 * Upload profile photo.
 */
export async function uploadProfilePhoto(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    if (!req.file) {
      throw new AppError('No image file provided', 400);
    }

    const photoUrl = `/uploads/${req.file.filename}`;
    user.profilePhoto = photoUrl;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile photo updated successfully',
      profilePhoto: photoUrl,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add or update delivery address in user's saved addresses.
 */
export async function addAddress(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const addressData = addAddressSchema.parse(req.body);

    if (addressData.isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    // If it's the first address, make it default automatically
    const isFirst = user.addresses.length === 0;

    user.addresses.push({
      houseNumber: addressData.houseNumber,
      streetArea: addressData.streetArea,
      villageTown: addressData.villageTown,
      landmark: addressData.landmark,
      coordinates: addressData.coordinates,
      isDefault: addressData.isDefault ?? isFirst,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Address saved successfully',
      addresses: user.addresses,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a saved address.
 */
export async function deleteAddress(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const { addressId } = req.params;

    user.addresses = user.addresses.filter(
      (a: any) => a._id?.toString() !== addressId
    );

    // If remaining addresses exist and none is default, set first as default
    if (user.addresses.length > 0 && !user.addresses.some((a) => a.isDefault)) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address removed successfully',
      addresses: user.addresses,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Step 1 for Account Deletion: Request OTP to verify identity before deleting account.
 */
export async function requestDeleteAccountOtp(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;

    await Otp.deleteMany({ mobile: user.mobile, purpose: 'ACCOUNT_DELETION' });

    const rawOtp = generateNumericOtp();
    const otpHash = await hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

    await Otp.create({
      mobile: user.mobile,
      otpHash,
      purpose: 'ACCOUNT_DELETION',
      expiresAt,
      attempts: 0,
      maxAttempts: env.OTP_MAX_ATTEMPTS,
      isVerified: false,
    });

    const smsProvider = getSmsProvider();
    const smsResult = await smsProvider.sendOtp(user.mobile, rawOtp, 'ACCOUNT_DELETION');

    res.status(200).json({
      success: true,
      message: `Account deletion verification OTP sent to +91-${user.mobile}`,
      expiresInMinutes: env.OTP_EXPIRY_MINUTES,
      ...(smsResult.devOtp ? { devOtp: smsResult.devOtp } : {}),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Step 2 for Account Deletion: Verify OTP and delete/anonymize user account.
 */
export async function confirmDeleteAccount(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const { otp } = confirmDeleteAccountSchema.parse(req.body);

    const otpDoc = await Otp.findOne({
      mobile: user.mobile,
      purpose: 'ACCOUNT_DELETION',
      isVerified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpDoc) {
      throw new AppError('Verification OTP has expired or is invalid.', 400);
    }

    const isMatch = await compareOtp(otp, otpDoc.otpHash);
    if (!isMatch) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      throw new AppError('Incorrect OTP. Please enter the correct code.', 400);
    }

    // Invalidate OTP
    await Otp.deleteOne({ _id: otpDoc._id });

    // Anonymize and mark user deleted for regulatory data compliance
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.name = 'Deleted Customer';
    // Append deleted timestamp to mobile so mobile index doesn't conflict if they sign up fresh in the future
    user.mobile = `deleted_${Date.now()}_${user.mobile}`;
    user.addresses = [];
    user.profilePhoto = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Your account has been deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}
