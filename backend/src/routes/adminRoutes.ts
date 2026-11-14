import { Router } from 'express';
import { adminLogin, getAdminProfile, adminLogout } from '../controllers/adminAuthController';
import {
  getDashboardSummary,
  getExpenses,
  addExpense,
  deleteExpense,
} from '../controllers/adminDashboardController';
import {
  getAdminProducts,
  getAdminProductById,
  createAdminProduct,
  updateAdminProduct,
  toggleProductAvailability,
  deleteAdminProduct,
  uploadProductImage,
} from '../controllers/adminProductController';
import {
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
} from '../controllers/adminCategoryController';
import {
  getAdminOrders,
  getAdminOrderById,
  markOrderDispatched,
  markOrderDelivered,
  cancelOrderByAdmin,
} from '../controllers/adminOrderController';
import {
  getAdminCustomers,
  getAdminCustomerById,
} from '../controllers/adminCustomerController';
import { requireAdminAuth } from '../middleware/adminAuthMiddleware';
import { adminImageUpload } from '../middleware/upload';

const router = Router();

// Public Admin Auth Routes
router.post('/auth/login', adminLogin);
router.post('/auth/logout', adminLogout);

// All subsequent admin routes require admin authentication
router.use(requireAdminAuth);

// Admin Profile
router.get('/auth/me', getAdminProfile);

// Module 1: Dashboard & Expenses
router.get('/dashboard/summary', getDashboardSummary);
router.get('/expenses', getExpenses);
router.post('/expenses', addExpense);
router.delete('/expenses/:id', deleteExpense);

// Module 2: Products
router.get('/products', getAdminProducts);
router.get('/products/:id', getAdminProductById);
router.post('/products', createAdminProduct);
router.put('/products/:id', updateAdminProduct);
router.patch('/products/:id/availability', toggleProductAvailability);
router.delete('/products/:id', deleteAdminProduct);
router.post('/products/upload-image', adminImageUpload.single('image'), uploadProductImage);

// Module 2: Categories
router.get('/categories', getAdminCategories);
router.post('/categories', createAdminCategory);
router.put('/categories/:id', updateAdminCategory);
router.delete('/categories/:id', deleteAdminCategory);

// Module 3: Orders
router.get('/orders', getAdminOrders);
router.get('/orders/:id', getAdminOrderById);
router.patch('/orders/:id/dispatch', markOrderDispatched);
router.patch('/orders/:id/deliver', markOrderDelivered);
router.patch('/orders/:id/cancel', cancelOrderByAdmin);

// Module 4: Customers
router.get('/customers', getAdminCustomers);
router.get('/customers/:id', getAdminCustomerById);

export default router;
