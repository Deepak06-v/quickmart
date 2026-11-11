import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  addAddress,
  deleteAddress,
  requestDeleteAccountOtp,
  confirmDeleteAccount,
} from '../controllers/profileController';
import { requireAuth } from '../middleware/authMiddleware';
import { profileUpload } from '../middleware/upload';
import { otpRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(requireAuth);

router.get('/', getProfile);
router.patch('/', updateProfile);
router.post('/photo', profileUpload.single('photo'), uploadProfilePhoto);
router.post('/addresses', addAddress);
router.delete('/addresses/:addressId', deleteAddress);
router.post('/delete-account/request-otp', otpRateLimiter, requestDeleteAccountOtp);
router.post('/delete-account/confirm', confirmDeleteAccount);

export default router;
