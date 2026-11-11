import { Router } from 'express';
import {
  requestOrderConfirmationOtp,
  confirmOrder,
  getCustomerOrders,
  getActiveOrder,
  getOrderDetails,
  cancelOrder,
} from '../controllers/orderController';
import { requireAuth } from '../middleware/authMiddleware';
import { otpRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// All order endpoints require customer authentication
router.use(requireAuth);

router.post('/request-otp', otpRateLimiter, requestOrderConfirmationOtp);
router.post('/confirm', confirmOrder);
router.get('/active', getActiveOrder);
router.get('/', getCustomerOrders);
router.get('/:id', getOrderDetails);
router.post('/:id/cancel', cancelOrder);

export default router;
