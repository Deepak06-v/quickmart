import { Router } from 'express';
import { autoSeedIfEmpty } from '../utils/autoSeed';
import authRoutes from './authRoutes';
import configRoutes from './configRoutes';
import categoryRoutes from './categoryRoutes';
import productRoutes from './productRoutes';
import cartRoutes from './cartRoutes';
import orderRoutes from './orderRoutes';
import profileRoutes from './profileRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/config', configRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/profile', profileRoutes);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'QuickMart Hyperlocal Grocery API',
  });
});

// Manual/On-demand Seed endpoint
router.all('/seed', async (req, res, next) => {
  try {
    const force = req.query.force === 'true' || req.body?.force === true;
    await autoSeedIfEmpty(force);
    res.status(200).json({
      success: true,
      message: 'Catalog seeded successfully.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
