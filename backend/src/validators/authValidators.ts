import { z } from 'zod';
import { INDIAN_MOBILE_REGEX, sanitizeMobile } from '../utils/mobile';

export const mobileRegex = INDIAN_MOBILE_REGEX;
export { sanitizeMobile };

export const requestAuthOtpSchema = z.object({
  mobile: z
    .string()
    .transform((val) => sanitizeMobile(val))
    .refine((val) => mobileRegex.test(val), {
      message: 'Please provide a valid 10-digit Indian mobile number',
    }),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50).optional(),
});

export const verifyAuthOtpSchema = z.object({
  mobile: z
    .string()
    .transform((val) => sanitizeMobile(val))
    .refine((val) => mobileRegex.test(val), {
      message: 'Please provide a valid 10-digit Indian mobile number',
    }),
  otp: z.string().trim().length(6, 'OTP must be exactly 6 digits'),
  name: z.string().trim().min(2).max(50).optional(),
});
