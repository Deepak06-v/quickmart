import { z } from 'zod';
import { deliveryAddressInputSchema } from './orderValidators';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50).optional(),
});

export const addAddressSchema = deliveryAddressInputSchema.extend({
  isDefault: z.boolean().optional(),
});

export const requestDeleteOtpSchema = z.object({
  reason: z.string().max(300).optional(),
});

export const confirmDeleteAccountSchema = z.object({
  otp: z.string().trim().length(6, 'Verification OTP must be 6 digits'),
});
