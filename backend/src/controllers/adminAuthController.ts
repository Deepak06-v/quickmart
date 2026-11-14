import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Admin } from '../models/Admin';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedAdminRequest } from '../middleware/adminAuthMiddleware';

interface LoginAttemptRecord {
  attempts: number;
  lockUntil?: number;
  lastAttempt: number;
}

const loginAttempts = new Map<string, LoginAttemptRecord>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

export function resetAdminLoginRateLimiter(): void {
  loginAttempts.clear();
}

function getLoginRateLimitKey(req: Request, email?: string): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const cleanEmail = (email || '').toLowerCase().trim();
  return `${ip}:${cleanEmail}`;
}

export async function adminLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const rateKey = getLoginRateLimitKey(req, email);
    const now = Date.now();
    const record = loginAttempts.get(rateKey);

    if (record?.lockUntil && now < record.lockUntil) {
      const remainingMinutes = Math.ceil((record.lockUntil - now) / 60000);
      throw new AppError(
        `Too many failed login attempts. Account temporarily locked. Please try again in ${remainingMinutes} minute(s).`,
        429
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const admin = await Admin.findOne({ email: cleanEmail });

    if (!admin) {
      // Record failed attempt
      const attempts = (record?.attempts || 0) + 1;
      const isLocking = attempts >= MAX_FAILED_ATTEMPTS;
      loginAttempts.set(rateKey, {
        attempts,
        lockUntil: isLocking ? now + LOCKOUT_DURATION_MS : undefined,
        lastAttempt: now,
      });
      throw new AppError('Invalid email or password', 401);
    }

    if (!admin.isActive) {
      throw new AppError('Admin account has been deactivated. Please contact support.', 403);
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      // Record failed attempt
      const attempts = (record?.attempts || 0) + 1;
      const isLocking = attempts >= MAX_FAILED_ATTEMPTS;
      loginAttempts.set(rateKey, {
        attempts,
        lockUntil: isLocking ? now + LOCKOUT_DURATION_MS : undefined,
        lastAttempt: now,
      });
      throw new AppError('Invalid email or password', 401);
    }

    // Reset rate limiter on successful authentication
    loginAttempts.delete(rateKey);

    admin.lastLogin = new Date();
    await admin.save();

    const token = jwt.sign(
      { adminId: admin._id.toString(), email: admin.email, role: 'admin' },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Admin signed in successfully',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminProfile(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const admin = req.admin;
    if (!admin) {
      throw new AppError('Admin not authenticated', 401);
    }

    res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function adminLogout(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    success: true,
    message: 'Admin signed out successfully',
  });
}
