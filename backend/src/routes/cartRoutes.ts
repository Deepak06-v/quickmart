import { Router } from 'express';
import { validateCart } from '../controllers/cartController';

const router = Router();

router.post('/validate', validateCart);

export default router;
