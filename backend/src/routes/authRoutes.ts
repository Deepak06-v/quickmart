import { Router } from 'express';
import {
  requestAuthOtp,
  verifyAuthOtp,
  getCurrentUser,
  logout,
} from '../controllers/authController';
import { requireAuth } from '../middleware/authMiddleware';
import { otpRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/request-otp', otpRateLimiter, requestAuthOtp);
router.post('/verify-otp', verifyAuthOtp);
router.get('/me', requireAuth, getCurrentUser);
router.post('/logout', requireAuth, logout);

export default router;
