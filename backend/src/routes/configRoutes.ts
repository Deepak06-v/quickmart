import { Router } from 'express';
import {
  getDeliveryConfig,
  getContactInfo,
  validateDeliveryLocation,
} from '../controllers/configController';

const router = Router();

router.get('/delivery', getDeliveryConfig);
router.get('/contact', getContactInfo);
router.post('/validate-location', validateDeliveryLocation);

export default router;
