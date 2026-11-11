import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

interface RateLimitRecord {
  lastRequestTime: number;
  count: number;
  windowStart: number;
}

const otpRateLimitMap = new Map<string, RateLimitRecord>();

// Clean up stale rate limit entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of otpRateLimitMap.entries()) {
    if (now - record.windowStart > 15 * 60 * 1000) {
      otpRateLimitMap.delete(key);
    }
  }
}, 10 * 60 * 1000);

export function otpRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const mobile = req.body?.mobile || req.ip || 'unknown';
  const now = Date.now();
  const cooldownMs = env.OTP_RESEND_COOLDOWN_SECONDS * 1000;
  const windowMs = 15 * 60 * 1000; // 15 min window
  const maxPerWindow = 6;

  const record = otpRateLimitMap.get(mobile);

  if (!record) {
    otpRateLimitMap.set(mobile, {
      lastRequestTime: now,
      count: 1,
      windowStart: now,
    });
    return next();
  }

  // Check cooldown between successive requests
  const elapsedSinceLast = now - record.lastRequestTime;
  if (elapsedSinceLast < cooldownMs) {
    const remainingSeconds = Math.ceil((cooldownMs - elapsedSinceLast) / 1000);
    res.status(429).json({
      success: false,
      message: `Please wait ${remainingSeconds} seconds before requesting another OTP.`,
      retryAfterSeconds: remainingSeconds,
    });
    return;
  }

  // Check sliding window request count
  if (now - record.windowStart < windowMs) {
    if (record.count >= maxPerWindow) {
      res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please wait 15 minutes before trying again.',
      });
      return;
    }
    record.count += 1;
    record.lastRequestTime = now;
  } else {
    // Reset window
    record.windowStart = now;
    record.count = 1;
    record.lastRequestTime = now;
  }

  next();
}
