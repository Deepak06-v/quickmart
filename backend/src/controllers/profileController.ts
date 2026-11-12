import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { issueAndSendOtp, verifyAndConsumeOtp } from '../services/otpService';
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

    const otpResult = await issueAndSendOtp(user.mobile, 'ACCOUNT_DELETION');

    res.status(200).json({
      success: true,
      message: `Account deletion verification OTP request accepted for +91-${user.mobile}`,
      expiresInMinutes: otpResult.expiresInMinutes,
      ...(otpResult.devOtp ? { devOtp: otpResult.devOtp } : {}),
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

    await verifyAndConsumeOtp(
      user.mobile,
      otp,
      'ACCOUNT_DELETION',
      'Verification OTP has expired or is invalid.'
    );

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
