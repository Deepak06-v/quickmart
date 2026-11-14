import { Router } from 'express';
import authRoutes from './authRoutes';
import configRoutes from './configRoutes';
import categoryRoutes from './categoryRoutes';
import productRoutes from './productRoutes';
import cartRoutes from './cartRoutes';
import orderRoutes from './orderRoutes';
import profileRoutes from './profileRoutes';
import adminRoutes from './adminRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/config', configRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/profile', profileRoutes);
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'QuickMart Hyperlocal Grocery API',
  });
});

// Mock catalog seeding is permanently disabled
router.all('/seed', (_req, res) => {
  res.status(400).json({
    success: false,
    message:
      'Automatic mock data seeding has been disabled. All products and categories must be managed through the Admin Dashboard.',
  });
});

export default router;
