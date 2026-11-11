import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, SALT_ROUNDS);
}

export async function compareOtp(plainOtp: string, hashedOtp: string): Promise<boolean> {
  return bcrypt.compare(plainOtp, hashedOtp);
}
