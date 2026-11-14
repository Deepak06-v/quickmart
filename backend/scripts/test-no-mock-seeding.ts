import { startServer } from '../src/app';
import { Server } from 'http';
import { disconnectDB } from '../src/config/db';
import { Product } from '../src/models/Product';
import { Category } from '../src/models/Category';
import { Order } from '../src/models/Order';
import { User } from '../src/models/User';
import { Admin } from '../src/models/Admin';
import { env } from '../src/config/env';
import { cleanupMockCatalog } from '../src/utils/catalogCleanup';
import { resetOtpRateLimiter } from '../src/middleware/rateLimiter';

async function runTests() {
  console.log('🧪 Starting Verification Tests: Removal of Mock Catalog Seeding & Safe Cleanup...\n');

  process.env.USE_IN_MEMORY_DB = 'true';
  process.env.PORT = '5005';
  env.PORT = 5005;
  process.env.ADMIN_EMAIL = 'owner@quickmart.in';
  process.env.ADMIN_PASSWORD = 'OwnerPassword2026!';
  process.env.ADMIN_NAME = 'Store Owner';

  let server: Server = await startServer();
  const baseUrl = `http://localhost:5005/api`;

  let testPassed = 0;
  let testFailed = 0;

  async function assert(name: string, fn: () => Promise<boolean>) {
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

  // 1. Fresh Database starts without any mock products or categories
  await assert('Fresh database starts with 0 products', async () => {
    const count = await Product.countDocuments();
    return count === 0;
  });

  await assert('Fresh database starts with 0 categories', async () => {
    const count = await Category.countDocuments();
    return count === 0;
  });

  await assert('Customer GET /categories returns empty list gracefully', async () => {
    const res = await fetch(`${baseUrl}/categories`);
    const data = await res.json();
    return data.success === true && Array.isArray(data.categories) && data.categories.length === 0;
  });

  await assert('Customer GET /products returns empty list gracefully', async () => {
    const res = await fetch(`${baseUrl}/products`);
    const data = await res.json();
    return data.success === true && Array.isArray(data.products) && data.products.length === 0;
  });

  // 2. Restarting server does NOT seed mock data
  await assert('Restarting backend does NOT seed mock products or categories', async () => {
    // Close current server and re-invoke startServer
    server.close();
    server = await startServer();
    const productCount = await Product.countDocuments();
    const categoryCount = await Category.countDocuments();
    return productCount === 0 && categoryCount === 0;
  });

  // 3. On-demand /seed endpoint is disabled
  await assert('Calling /seed endpoint returns HTTP 400 and rejects seeding', async () => {
    const res = await fetch(`${baseUrl}/seed`, { method: 'POST' });
    const data = await res.json();
    const productCount = await Product.countDocuments();
    return res.status === 400 && data.success === false && productCount === 0;
  });

  // 4. Test safe cleanup of existing mock catalog
  // Create fixture: mock category & mock products (one unreferenced, one referenced by an order)
  const mockVegCategory = await Category.create({
    name: 'Fresh Vegetables',
    slug: 'vegetables',
    imageUrl: 'https://example.com/veg.jpg',
    displayOrder: 1,
  });

  const mockHouseholdCategory = await Category.create({
    name: 'Household Essentials',
    slug: 'household',
    imageUrl: 'https://example.com/house.jpg',
    displayOrder: 9,
  });

  const unreferencedMockProduct = await Product.create({
    name: 'Crisp Royal Gala Apples',
    category: mockVegCategory._id,
    originalPrice: 180,
    discountedPrice: 145,
    unit: '1 kg',
    isAvailable: true,
  });

  const referencedMockProduct = await Product.create({
    name: 'Farm Fresh Onions (Pyaz)',
    category: mockVegCategory._id,
    originalPrice: 40,
    discountedPrice: 32,
    unit: '1 kg',
    isAvailable: true,
  });

  // Create an admin-created genuine product
  const genuineAdminProduct = await Product.create({
    name: 'Organic Fresh Methi Leaves',
    category: mockVegCategory._id,
    originalPrice: 25,
    discountedPrice: 20,
    unit: '250 g',
    isAvailable: true,
  });

  // Create customer and order referencing the mock onion product
  const user = await User.create({
    mobile: '9876543210',
    name: 'Ramesh Patel',
  });

  const historicalOrder = await Order.create({
    orderNumber: 'QM-TEST-9999',
    user: user._id,
    items: [
      {
        product: referencedMockProduct._id,
        name: referencedMockProduct.name,
        price: referencedMockProduct.discountedPrice,
        quantity: 2,
        unit: referencedMockProduct.unit,
        image: 'https://example.com/onion.jpg',
        total: 64,
      },
    ],
    subtotal: 64,
    deliveryFee: 15,
    totalAmount: 79,
    paymentMethod: 'COD',
    paymentStatus: 'PAID',
    deliveryAddress: {
      houseNumber: '101',
      streetArea: 'Station Road',
      villageTown: 'Anand',
      customerName: 'Ramesh Patel',
      customerMobile: '9876543210',
    },
    status: 'Delivered',
    distanceKm: 2.5,
    estimatedDeliveryMinutes: 20,
    estimatedDeliveryTime: new Date(),
  });

  // Execute cleanup
  const cleanupStats = await cleanupMockCatalog();

  await assert('Unreferenced mock product is permanently removed', async () => {
    const found = await Product.findById(unreferencedMockProduct._id);
    return found === null && cleanupStats.removedProducts >= 1;
  });

  await assert('Referenced mock product is retained in DB but archived (isAvailable = false)', async () => {
    const found = await Product.findById(referencedMockProduct._id);
    return found !== null && found.isAvailable === false && cleanupStats.archivedProducts >= 1;
  });

  await assert('Archived mock product does NOT appear in active customer GET /products', async () => {
    const res = await fetch(`${baseUrl}/products`);
    const data = await res.json();
    const hasMock = data.products.some((p: any) => p._id === referencedMockProduct._id.toString());
    return !hasMock;
  });

  await assert('Order history for customer remains 100% intact with item details', async () => {
    const orderInDb = await Order.findById(historicalOrder._id);
    return (
      orderInDb !== null &&
      orderInDb.items.length === 1 &&
      orderInDb.items[0].name === 'Farm Fresh Onions (Pyaz)' &&
      orderInDb.totalAmount === 79
    );
  });

  await assert('Genuine admin-created product is completely preserved and active', async () => {
    const found = await Product.findById(genuineAdminProduct._id);
    return found !== null && found.isAvailable === true && found.name === 'Organic Fresh Methi Leaves';
  });

  await assert('Unused mock category (household) was deleted', async () => {
    const found = await Category.findById(mockHouseholdCategory._id);
    return found === null;
  });

  await assert('In-use category (vegetables) was preserved because admin product is attached', async () => {
    const found = await Category.findById(mockVegCategory._id);
    return found !== null;
  });

  // 5. Test Admin Dashboard Workflow -> Catalog Creation & Customer Visibility
  // Admin Login
  const loginRes = await fetch(`${baseUrl}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'owner@quickmart.in',
      password: 'OwnerPassword2026!',
    }),
  });
  const loginData = await loginRes.json();
  const adminToken = loginData.token;

  let newCatId = '';
  await assert('Admin creates new category via POST /admin/categories', async () => {
    const res = await fetch(`${baseUrl}/admin/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Fresh Bakery & Breads',
        slug: 'bakery-breads',
        iconName: 'fast-food-outline',
        imageUrl: 'https://example.com/bread.jpg',
        displayOrder: 2,
      }),
    });
    const data = await res.json();
    newCatId = data.category?._id;
    return res.status === 201 && data.success && !!newCatId;
  });

  let newProdId = '';
  await assert('Admin creates new product via POST /admin/products', async () => {
    const res = await fetch(`${baseUrl}/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Artisan Whole Wheat Pav',
        description: 'Freshly baked local soft pav buns.',
        category: newCatId,
        images: ['https://example.com/pav.jpg'],
        originalPrice: 40,
        discountedPrice: 35,
        unit: '6 pcs Pack',
        isAvailable: true,
      }),
    });
    const data = await res.json();
    newProdId = data.product?._id;
    return res.status === 201 && data.success && !!newProdId;
  });

  await assert('Admin-created product immediately visible in customer GET /products', async () => {
    const res = await fetch(`${baseUrl}/products`);
    const data = await res.json();
    return data.success && data.products.some((p: any) => p._id === newProdId);
  });

  await assert('Admin-created product searchable via GET /products/search?q=pav', async () => {
    const res = await fetch(`${baseUrl}/products/search?q=pav`);
    const data = await res.json();
    return data.success && data.products.length === 1 && data.products[0].name.includes('Pav');
  });

  await assert('Customer cart validation works with admin-created product', async () => {
    const res = await fetch(`${baseUrl}/cart/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: newProdId, quantity: 3 }],
      }),
    });
    const data = await res.json();
    // 35 * 3 = 105
    return data.success && data.subtotal === 105 && data.itemCount === 3;
  });

  // Authenticate customer to place an order
  const otpRes = await fetch(`${baseUrl}/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: '9876543210' }),
  });
  const otpData = await otpRes.json();
  const verifyRes = await fetch(`${baseUrl}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: '9876543210', otp: otpData.devOtp }),
  });
  const verifyData = await verifyRes.json();
  const customerToken = verifyData.token;

  // Reset rate limiter for the second OTP in test environment
  resetOtpRateLimiter();

  // Request order confirmation OTP
  const orderOtpRes = await fetch(`${baseUrl}/orders/request-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      items: [{ productId: newProdId, quantity: 3 }],
      address: {
        houseNumber: '202',
        streetArea: 'College Road',
        villageTown: 'Anand',
        coordinates: { latitude: 22.5645, longitude: 72.9289 },
      },
    }),
  });
  const orderOtpData = await orderOtpRes.json();
  const orderOtp = orderOtpData.devOtp;

  await assert('Customer can place order with admin-created product via /orders/confirm', async () => {
    const res = await fetch(`${baseUrl}/orders/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        otp: orderOtp,
        items: [{ productId: newProdId, quantity: 3 }],
        address: {
          houseNumber: '202',
          streetArea: 'College Road',
          villageTown: 'Anand',
          coordinates: { latitude: 22.5645, longitude: 72.9289 },
        },
        paymentMethod: 'COD',
      }),
    });
    const data = await res.json();
    return res.status === 201 && data.success && data.order?.orderNumber.startsWith('QM-');
  });

  // Cleanup & exit
  server.close();
  await disconnectDB();

  console.log(`\n🏁 Test Summary: ${testPassed} passed, ${testFailed} failed.\n`);
  if (testFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
