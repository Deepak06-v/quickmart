import { Router } from 'express';
import {
  getAllCategories,
  getCategoryProducts,
} from '../controllers/categoryController';

const router = Router();

router.get('/', getAllCategories);
router.get('/:slug/products', getCategoryProducts);

export default router;
