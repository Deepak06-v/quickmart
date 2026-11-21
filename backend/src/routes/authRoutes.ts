import { Router } from 'express';
import {
  requestAuthOtp,
  verifyAuthOtp,
  getCurrentUser,
  logout,
  requestPublicDeleteAccountOtp,
  confirmPublicDeleteAccount,
} from '../controllers/authController';
import { requireAuth } from '../middleware/authMiddleware';
import { otpRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/request-otp', otpRateLimiter, requestAuthOtp);
router.post('/verify-otp', verifyAuthOtp);
router.get('/me', requireAuth, getCurrentUser);
router.post('/logout', requireAuth, logout);

// Public web account deletion endpoints
router.post('/delete-account/request-otp', otpRateLimiter, requestPublicDeleteAccountOtp);
router.post('/delete-account/confirm', confirmPublicDeleteAccount);

export default router;
