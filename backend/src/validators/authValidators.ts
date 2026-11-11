import { z } from 'zod';

// Regex for standard Indian 10-digit mobile number
export const mobileRegex = /^[6-9]\d{9}$/;

export function sanitizeMobile(raw: string): string {
  // Strip whitespace, dashes, plus signs
  const cleaned = raw.replace(/[\s\-\+]/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned.slice(2);
  }
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return cleaned.slice(1);
  }
  return cleaned;
}

export const requestAuthOtpSchema = z.object({
  mobile: z
    .string()
    .transform(sanitizeMobile)
    .refine((val) => mobileRegex.test(val), {
      message: 'Please provide a valid 10-digit Indian mobile number',
    }),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50).optional(),
});

export const verifyAuthOtpSchema = z.object({
  mobile: z
    .string()
    .transform(sanitizeMobile)
    .refine((val) => mobileRegex.test(val), {
      message: 'Please provide a valid 10-digit Indian mobile number',
    }),
  otp: z.string().trim().length(6, 'OTP must be exactly 6 digits'),
  name: z.string().trim().min(2).max(50).optional(),
});
