import { startServer } from '../src/app';
import { Server } from 'http';
import { disconnectDB } from '../src/config/db';
import { Admin } from '../src/models/Admin';
import { User } from '../src/models/User';
import { Product } from '../src/models/Product';
import { Category } from '../src/models/Category';
import { Order } from '../src/models/Order';
import { Expense } from '../src/models/Expense';
import { env } from '../src/config/env';
import { resetAdminLoginRateLimiter } from '../src/controllers/adminAuthController';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

async function runAdminTests() {
  console.log('🧪 Starting Admin Dashboard Integration Tests...\n');
  process.env.USE_IN_MEMORY_DB = 'true';
  process.env.PORT = '5002';
  env.PORT = 5002;

  const server: Server = await startServer();
  const baseUrl = `http://localhost:5002/api`;

  let testPassed = 0;
  let testFailed = 0;

  async function assert(name: string, fn: () => Promise<boolean>): Promise<void> {
    try {
      const res = await fn();
      if (res) {
        console.log(`  ✅ PASS: ${name}`);
        testPassed++;
      } else {
        console.error(`  ❌ FAIL: ${name} -> returned false`);
        testFailed++;
      }
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name} -> threw error: ${err.message}`);
      testFailed++;
    }
  }

  // Ensure database has no default admin pre-seeded
  await Admin.deleteMany({});
  resetAdminLoginRateLimiter();

  // 1. Verify that hardcoded default credentials DO NOT work
  await assert('Default unprovisioned credentials (admin@quickmart.in) return 401', async () => {
    const res = await fetch(`${baseUrl}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@quickmart.in',
        password: 'Admin@QuickMart2026!',
      }),
    });
    return res.status === 401;
  });

  // 2. Provision explicit admin credentials (mimicking create-admin.ts)
  const testAdminEmail = 'manager@quickmart.in';
  const testAdminPassword = 'SecureStoreManager2026!';
  const hashedPassword = await bcrypt.hash(testAdminPassword, 10);
  const provisionedAdmin = await Admin.create({
    name: 'QuickMart Store Manager',
    email: testAdminEmail,
    password: hashedPassword,
    role: 'admin',
    isActive: true,
  });

  // 3. Test Login with explicitly provisioned credentials
  let adminToken = '';
  await assert('Admin Login with provisioned credentials returns JWT & admin profile', async () => {
    const res = await fetch(`${baseUrl}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testAdminEmail,
        password: testAdminPassword,
      }),
    });
    const data = await res.json();
    adminToken = data.token;
    return data.success && !!data.token && data.admin.email === testAdminEmail;
  });

  // 4. Test Login with wrong password returns 401
  await assert('Admin Login with wrong password returns 401', async () => {
    const res = await fetch(`${baseUrl}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testAdminEmail,
        password: 'IncorrectPassword999!',
      }),
    });
    return res.status === 401;
  });

  // 5. Test Rate Limiting on excessive failed attempts
  await assert('Login rate limiter locks account after 5 consecutive failed attempts (429)', async () => {
    // 4 more failed attempts (1 already occurred above)
    for (let i = 0; i < 4; i++) {
      await fetch(`${baseUrl}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testAdminEmail, password: 'BadPassword!' }),
      });
    }
    // 6th attempt should return 429
    const lockRes = await fetch(`${baseUrl}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testAdminEmail, password: 'BadPassword!' }),
    });
    const data = await lockRes.json();
    return lockRes.status === 429 && data.message.includes('locked');
  });

  // Reset rate limiter for remaining tests
  resetAdminLoginRateLimiter();

  // 6. Test Protected admin endpoint rejects request without token
  await assert('Protected admin endpoint rejects request without token (401)', async () => {
    const res = await fetch(`${baseUrl}/admin/auth/me`);
    return res.status === 401;
  });

  // 7. Test Customer Token cannot access admin endpoints
  await assert('Customer token cannot access admin endpoints (403)', async () => {
    const customerToken = jwt.sign(
      { userId: '654321654321654321654321', mobile: '9999999999' },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    const res = await fetch(`${baseUrl}/admin/dashboard/summary`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    return res.status === 403;
  });

  // 8. Test Admin Me endpoint
  await assert('GET /admin/auth/me returns authenticated admin', async () => {
    const res = await fetch(`${baseUrl}/admin/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    return data.success && data.admin.email === testAdminEmail;
  });

  // 9. Test Expense Recording & Monthly Calculation
  let createdExpenseId = '';
  await assert('POST /admin/expenses creates expense record', async () => {
    const res = await fetch(`${baseUrl}/admin/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        description: 'Vegetable crate packaging materials',
        amount: 450,
        date: new Date().toISOString(),
      }),
    });
    const data = await res.json();
    createdExpenseId = data.expense?._id;
    return data.success && data.expense.amount === 450;
  });

  // 10. Test Dashboard Summary includes expense and calculates correctly
  await assert('GET /admin/dashboard/summary returns monthly metrics and recorded expenses', async () => {
    const now = new Date();
    const res = await fetch(`${baseUrl}/admin/dashboard/summary?year=${now.getFullYear()}&month=${now.getMonth() + 1}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    return data.success && data.metrics.totalExpenses >= 450;
  });

  // 11. Test Product Creation by Admin
  let testProductId = '';
  const vegCategory = (await Category.findOne({ slug: 'vegetables' })) || (await Category.create({
    name: 'Fresh Vegetables',
    slug: 'vegetables',
    imageUrl: 'https://example.com/veg.jpg',
    displayOrder: 1,
  }));

  await assert('POST /admin/products creates a new product', async () => {
    const res = await fetch(`${baseUrl}/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Organic Sweet Corn',
        description: 'Naturally grown tender sweet corn cobs',
        category: vegCategory._id,
        originalPrice: 50,
        discountedPrice: 40,
        unit: '2 pcs',
        isAvailable: true,
      }),
    });
    const data = await res.json();
    testProductId = data.product?._id;
    return data.success && data.product.name === 'Organic Sweet Corn' && data.product.discountPercentage === 20;
  });

  // 12. Test Product Edit by Admin
  await assert('PUT /admin/products/:id updates existing product', async () => {
    const res = await fetch(`${baseUrl}/admin/products/${testProductId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Premium Organic Sweet Corn',
        discountedPrice: 35,
      }),
    });
    const data = await res.json();
    return data.success && data.product.name === 'Premium Organic Sweet Corn' && data.product.discountedPrice === 35;
  });

  // 13. Test Product Availability Toggle
  await assert('PATCH /admin/products/:id/availability marks product unavailable', async () => {
    const res = await fetch(`${baseUrl}/admin/products/${testProductId}/availability`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isAvailable: false }),
    });
    const data = await res.json();
    return data.success && data.isAvailable === false;
  });

  // 14. Test Category Management (Add & Safe Delete)
  let testCatId = '';
  await assert('POST /admin/categories adds new category', async () => {
    const res = await fetch(`${baseUrl}/admin/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Bakery & Snacks Test',
        slug: 'bakery-snacks-test',
        iconName: 'fast-food-outline',
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&q=80',
      }),
    });
    const data = await res.json();
    testCatId = data.category?._id;
    return data.success && data.category.name === 'Bakery & Snacks Test';
  });

  await assert('DELETE /admin/categories/:id safely deletes empty category', async () => {
    const res = await fetch(`${baseUrl}/admin/categories/${testCatId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    return data.success === true;
  });

  // Create test customer
  const testCustomer = await User.create({
    name: 'Ramesh Patel',
    mobile: '9825012345',
    addresses: [
      {
        houseNumber: '12',
        streetArea: 'Amul Dairy Road',
        villageTown: 'Anand',
        isDefault: true,
      },
    ],
  });

  // Create test orders
  const testOrderUnpaid = await Order.create({
    orderNumber: 'ORD-TEST-UNPAID',
    user: testCustomer._id,
    items: [
      {
        product: testProductId,
        name: 'Organic Sweet Corn',
        price: 35,
        quantity: 2,
        unit: '2 pcs',
        image: 'https://example.com/corn.jpg',
        total: 70,
      },
    ],
    subtotal: 70,
    deliveryFee: 25,
    totalAmount: 95,
    paymentMethod: 'COD',
    paymentStatus: 'PENDING_ON_DELIVERY',
    deliveryAddress: {
      houseNumber: '12',
      streetArea: 'Amul Dairy Road',
      villageTown: 'Anand',
      customerName: 'Ramesh Patel',
      customerMobile: '9825012345',
    },
    status: 'Out for Delivery',
    statusHistory: [{ status: 'Out for Delivery', timestamp: new Date() }],
    distanceKm: 2.5,
    estimatedDeliveryMinutes: 20,
    estimatedDeliveryTime: new Date(),
  });

  const testOrderPaid = await Order.create({
    orderNumber: 'ORD-TEST-PAID',
    user: testCustomer._id,
    items: [
      {
        product: testProductId,
        name: 'Organic Sweet Corn',
        price: 35,
        quantity: 1,
        unit: '2 pcs',
        image: 'https://example.com/corn.jpg',
        total: 35,
      },
    ],
    subtotal: 35,
    deliveryFee: 25,
    totalAmount: 60,
    paymentMethod: 'COD',
    paymentStatus: 'PENDING_ON_DELIVERY',
    deliveryAddress: {
      houseNumber: '12',
      streetArea: 'Amul Dairy Road',
      villageTown: 'Anand',
      customerName: 'Ramesh Patel',
      customerMobile: '9825012345',
    },
    status: 'Out for Delivery',
    statusHistory: [{ status: 'Out for Delivery', timestamp: new Date() }],
    distanceKm: 2.5,
    estimatedDeliveryMinutes: 20,
    estimatedDeliveryTime: new Date(),
  });

  // 15. Test COD Confirmation: Cash NOT collected
  await assert('Delivering with cashCollected: false marks Delivered but retains paymentStatus: PENDING_ON_DELIVERY', async () => {
    const res = await fetch(`${baseUrl}/admin/orders/${testOrderUnpaid._id}/deliver`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ cashCollected: false }),
    });
    const data = await res.json();
    return data.success && data.order.status === 'Delivered' && data.order.paymentStatus === 'PENDING_ON_DELIVERY';
  });

  // 16. Test COD Confirmation: Cash Collected
  await assert('Delivering with cashCollected: true marks Delivered and paymentStatus: PAID', async () => {
    const res = await fetch(`${baseUrl}/admin/orders/${testOrderPaid._id}/deliver`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ cashCollected: true }),
    });
    const data = await res.json();
    return data.success && data.order.status === 'Delivered' && data.order.paymentStatus === 'PAID';
  });

  // 17. Test Cancellation does NOT modify stockQuantity
  const cornProductBefore = await Product.findById(testProductId);
  const initialStock = cornProductBefore?.stockQuantity ?? 100;

  const testOrderCancel = await Order.create({
    orderNumber: 'ORD-TEST-CANCEL',
    user: testCustomer._id,
    items: [
      {
        product: testProductId,
        name: 'Organic Sweet Corn',
        price: 35,
        quantity: 5,
        unit: '2 pcs',
        image: 'https://example.com/corn.jpg',
        total: 175,
      },
    ],
    subtotal: 175,
    deliveryFee: 25,
    totalAmount: 200,
    paymentMethod: 'COD',
    paymentStatus: 'PENDING_ON_DELIVERY',
    deliveryAddress: {
      houseNumber: '12',
      streetArea: 'Amul Dairy Road',
      villageTown: 'Anand',
      customerName: 'Ramesh Patel',
      customerMobile: '9825012345',
    },
    status: 'Order Placed',
    statusHistory: [{ status: 'Order Placed', timestamp: new Date() }],
    distanceKm: 2.5,
    estimatedDeliveryMinutes: 20,
    estimatedDeliveryTime: new Date(),
  });

  await assert('Cancelling order updates status but does NOT modify product stock quantity', async () => {
    const res = await fetch(`${baseUrl}/admin/orders/${testOrderCancel._id}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ reason: 'Customer requested change' }),
    });
    const data = await res.json();
    const cornProductAfter = await Product.findById(testProductId);
    // Stock quantity must remain unchanged (no restocking logic)
    return (
      data.success &&
      data.order.status === 'Cancelled' &&
      cornProductAfter?.stockQuantity === initialStock
    );
  });

  // 18. Test Safe Product Deletion (archives because referenced in historical orders)
  await assert('DELETE /admin/products/:id archives referenced product instead of deleting', async () => {
    const res = await fetch(`${baseUrl}/admin/products/${testProductId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    const productAfter = await Product.findById(testProductId);
    return data.success && data.archived === true && productAfter?.isAvailable === false;
  });

  // 19. Test Customers List in Admin
  await assert('GET /admin/customers lists registered customers with order counts', async () => {
    const res = await fetch(`${baseUrl}/admin/customers?search=Ramesh`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    const customer = data.customers?.find((c: any) => c.mobile === '9825012345');
    return data.success && !!customer && customer.totalOrders >= 2;
  });

  // 20. Test Customer Details & Order History in Admin
  await assert('GET /admin/customers/:id returns customer profile and order history', async () => {
    const res = await fetch(`${baseUrl}/admin/customers/${testCustomer._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    return data.success && data.customer.name === 'Ramesh Patel' && data.orders.length >= 2;
  });

  // Clean up
  await Expense.findByIdAndDelete(createdExpenseId);
  await Order.deleteMany({ _id: { $in: [testOrderUnpaid._id, testOrderPaid._id, testOrderCancel._id] } });
  await User.findByIdAndDelete(testCustomer._id);
  await Product.findByIdAndDelete(testProductId);
  await Admin.findByIdAndDelete(provisionedAdmin._id);

  console.log(`\n🏁 Admin Tests summary: ${testPassed} passed, ${testFailed} failed.`);

  server.close();
  await disconnectDB();

  if (testFailed > 0) {
    process.exit(1);
  }
}

runAdminTests().catch((err) => {
  console.error('Fatal admin test error:', err);
  process.exit(1);
});
