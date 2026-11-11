import { Router } from 'express';
import {
  getDeliveryConfig,
  validateDeliveryLocation,
} from '../controllers/configController';

const router = Router();

router.get('/delivery', getDeliveryConfig);
router.post('/validate-location', validateDeliveryLocation);

export default router;
