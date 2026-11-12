import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { sanitizeMobile, INDIAN_MOBILE_REGEX } from '../utils/mobile';

interface RateLimitRecord {
  lastRequestTime: number;
  minuteTimestamps: number[];
  windowTimestamps: number[];
}

const otpRateLimitMap = new Map<string, RateLimitRecord>();

const ONE_MINUTE_MS = 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const MAX_PER_MINUTE = 3; // APITXT limit: max 3 OTP requests per mobile per minute across all purposes
const MAX_PER_15_MINUTES = 6;

// Clean up stale rate limit entries every 10 minutes
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of otpRateLimitMap.entries()) {
    const recent = record.windowTimestamps.filter((ts) => now - ts < FIFTEEN_MINUTES_MS);
    if (recent.length === 0) {
      otpRateLimitMap.delete(key);
    } else {
      record.windowTimestamps = recent;
      record.minuteTimestamps = record.minuteTimestamps.filter((ts) => now - ts < ONE_MINUTE_MS);
    }
  }
}, 10 * 60 * 1000);
cleanupTimer.unref();

export function resetOtpRateLimiter(): void {
  otpRateLimitMap.clear();
}

function getRateLimitKey(req: Request): string {
  const authMobile = (req as any).user?.mobile;
  if (typeof authMobile === 'string' && authMobile.trim()) {
    const cleaned = sanitizeMobile(authMobile, env.APITXT_COUNTRY);
    if (INDIAN_MOBILE_REGEX.test(cleaned)) {
      return `mobile:${cleaned}`;
    }
    return `mobile:${authMobile.trim()}`;
  }

  const bodyMobile = req.body?.mobile;
  if (typeof bodyMobile === 'string' && bodyMobile.trim()) {
    const cleaned = sanitizeMobile(bodyMobile, env.APITXT_COUNTRY);
    return `mobile:${cleaned}`;
  }

  return `ip:${req.ip || 'unknown'}`;
}

export function otpRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const key = getRateLimitKey(req);
  const now = Date.now();
  const cooldownMs = env.OTP_RESEND_COOLDOWN_SECONDS * 1000;

  const existing = otpRateLimitMap.get(key);
  if (!existing) {
    otpRateLimitMap.set(key, {
      lastRequestTime: now,
      minuteTimestamps: [now],
      windowTimestamps: [now],
    });
    return next();
  }

  // Prune expired timestamps
  existing.minuteTimestamps = existing.minuteTimestamps.filter((ts) => now - ts < ONE_MINUTE_MS);
  existing.windowTimestamps = existing.windowTimestamps.filter((ts) => now - ts < FIFTEEN_MINUTES_MS);

  // 1. Enforce APITXT 1-minute limit (<= 3 OTP requests per mobile per minute across all purposes)
  if (existing.minuteTimestamps.length >= MAX_PER_MINUTE) {
    const oldestInMinute = existing.minuteTimestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((ONE_MINUTE_MS - (now - oldestInMinute)) / 1000));
    res.status(429).json({
      success: false,
      message: 'Please wait before requesting another OTP.',
      code: 'OTP_RATE_LIMITED',
      retryAfterSeconds,
    });
    return;
  }

  // 2. Enforce resend cooldown
  const elapsedSinceLast = now - existing.lastRequestTime;
  if (cooldownMs > 0 && elapsedSinceLast < cooldownMs) {
    const remainingSeconds = Math.ceil((cooldownMs - elapsedSinceLast) / 1000);
    res.status(429).json({
      success: false,
      message: `Please wait ${remainingSeconds} seconds before requesting another OTP.`,
      code: 'OTP_COOLDOWN_ACTIVE',
      retryAfterSeconds: remainingSeconds,
    });
    return;
  }

  // 3. Enforce 15-minute window limit
  if (existing.windowTimestamps.length >= MAX_PER_15_MINUTES) {
    res.status(429).json({
      success: false,
      message: 'Too many OTP requests. Please wait 15 minutes before trying again.',
      code: 'OTP_WINDOW_LIMIT',
    });
    return;
  }

  existing.lastRequestTime = now;
  existing.minuteTimestamps.push(now);
  existing.windowTimestamps.push(now);

  next();
}
