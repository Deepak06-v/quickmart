import { Router } from 'express';
import {
  getAllProducts,
  searchProducts,
  getProductDetails,
  getOffers,
  getRecommendedProducts,
} from '../controllers/productController';

const router = Router();

router.get('/', getAllProducts);
router.get('/search', searchProducts);
router.get('/offers', getOffers);
router.get('/recommended', getRecommendedProducts);
router.get('/:id', getProductDetails);

export default router;
