import { startServer } from '../src/app';
import { Server } from 'http';
import { disconnectDB } from '../src/config/db';
import { Category } from '../src/models/Category';
import { Product } from '../src/models/Product';
import { DeliveryConfig } from '../src/models/DeliveryConfig';
import { env } from '../src/config/env';

async function runTests() {
  console.log('🧪 Starting backend integration tests...\n');
  process.env.USE_IN_MEMORY_DB = 'true';
  process.env.PORT = '5001';
  env.PORT = 5001;

  const server: Server = await startServer();
  const baseUrl = `http://localhost:5001/api`;

  // Seed minimal data for test
  const cat = await Category.create({
    name: 'Fresh Vegetables',
    slug: 'vegetables',
    imageUrl: 'https://example.com/veg.jpg',
    displayOrder: 1,
  });

  const product1 = await Product.create({
    name: 'Fresh Farm Onions',
    description: 'Crisp red onions',
    category: cat._id,
    images: ['https://example.com/onion.jpg'],
    originalPrice: 40,
    discountedPrice: 32,
    discountPercentage: 20,
    unit: '1 kg',
    stockQuantity: 100,
    isAvailable: true,
    isFeatured: true,
    isOffer: true,
    tags: ['onion', 'vegetables'],
  });

  const product2 = await Product.create({
    name: 'Fresh Farm Potatoes',
    description: 'Clean potatoes',
    category: cat._id,
    images: ['https://example.com/potato.jpg'],
    originalPrice: 35,
    discountedPrice: 28,
    discountPercentage: 20,
    unit: '1 kg',
    stockQuantity: 100,
    isAvailable: true,
    isFeatured: true,
    isOffer: true,
    tags: ['potato', 'vegetables'],
  });

  let testPassed = 0;
  let testFailed = 0;

  async function assert(desc: string, fn: () => Promise<boolean | void>) {
    try {
      const res = await fn();
      if (res === false) {
        throw new Error('Assertion returned false');
      }
      console.log(`  ✅ PASS: ${desc}`);
      testPassed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${desc} -> ${err.message}`);
      testFailed++;
    }
  }

  // Test 1: Health check
  await assert('GET /health returns status ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const data = await res.json();
    return data.status === 'ok';
  });

  // Test 2: Delivery Config
  await assert('GET /config/delivery returns store location & delivery radius', async () => {
    const res = await fetch(`${baseUrl}/config/delivery`);
    const data = await res.json();
    return data.success && data.config.deliveryRadiusKm === 15;
  });

  // Test 3: Validate location inside radius
  await assert('POST /config/validate-location (within radius)', async () => {
    const res = await fetch(`${baseUrl}/config/validate-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: 22.565, longitude: 72.93 }),
    });
    const data = await res.json();
    return data.success && data.isDeliverable === true;
  });

  // Test 4: Validate location outside radius
  await assert('POST /config/validate-location (outside radius)', async () => {
    const res = await fetch(`${baseUrl}/config/validate-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: 28.6139, longitude: 77.209 }), // New Delhi coordinates (far away)
    });
    const data = await res.json();
    return data.success && data.isDeliverable === false;
  });

  // Test 5: Categories
  await assert('GET /categories returns categories list', async () => {
    const res = await fetch(`${baseUrl}/categories`);
    const data = await res.json();
    return data.success && data.categories.length > 0;
  });

  // Test 6: Products & Search
  await assert('GET /products/search?q=onion finds onions', async () => {
    const res = await fetch(`${baseUrl}/products/search?q=onion`);
    const data = await res.json();
    return data.success && data.products.length === 1 && data.products[0].name.includes('Onion');
  });

  // Test 7: Cart Revalidation
  await assert('POST /cart/validate recalculates server-side totals accurately', async () => {
    const res = await fetch(`${baseUrl}/cart/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          { productId: product1._id.toString(), quantity: 2 }, // 32 * 2 = 64
          { productId: product2._id.toString(), quantity: 3 }, // 28 * 3 = 84
        ],
      }),
    });
    const data = await res.json();
    // Subtotal: 64 + 84 = 148
    return data.success && data.subtotal === 148 && data.itemCount === 5;
  });

  // Test 8: Auth Step 1 - Request OTP
  let authOtp = '';
  await assert('POST /auth/request-otp generates OTP', async () => {
    const res = await fetch(`${baseUrl}/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876543210', name: 'Ramesh Patel' }),
    });
    const data = await res.json();
    authOtp = data.devOtp;
    return data.success && !!data.devOtp;
  });

  // Test 9: Auth Step 2 - Verify OTP & get JWT
  let authToken = '';
  let customerId = '';
  await assert('POST /auth/verify-otp issues JWT and creates user', async () => {
    const res = await fetch(`${baseUrl}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876543210', otp: authOtp, name: 'Ramesh Patel' }),
    });
    const data = await res.json();
    authToken = data.token;
    customerId = data.user.id;
    return data.success && !!data.token && data.user.name === 'Ramesh Patel';
  });

  // Test 10: Auth Protected Endpoint
  await assert('GET /auth/me returns authenticated customer', async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    return data.success && data.user.mobile === '9876543210';
  });

  // Test 11: COD Order Confirmation Step 1 - Request 2nd OTP
  let orderOtp = '';
  await assert('POST /orders/request-otp generates 2nd separate OTP for COD', async () => {
    const res = await fetch(`${baseUrl}/orders/request-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        items: [
          { productId: product1._id.toString(), quantity: 2 },
          { productId: product2._id.toString(), quantity: 2 },
        ],
        address: {
          houseNumber: '42, Shanti Nagar',
          streetArea: 'Station Road',
          villageTown: 'Anand Rural',
          landmark: 'Near Hanuman Temple',
          coordinates: { latitude: 22.5646, longitude: 72.929 },
        },
      }),
    });
    const data = await res.json();
    orderOtp = data.devOtp;
    return data.success && !!data.devOtp;
  });

  // Test 12: COD Order Confirmation Step 2 - Verify 2nd OTP & place order
  let placedOrderId = '';
  await assert('POST /orders/confirm places COD order only after valid 2nd OTP', async () => {
    const res = await fetch(`${baseUrl}/orders/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        otp: orderOtp,
        items: [
          { productId: product1._id.toString(), quantity: 2 },
          { productId: product2._id.toString(), quantity: 2 },
        ],
        address: {
          houseNumber: '42, Shanti Nagar',
          streetArea: 'Station Road',
          villageTown: 'Anand Rural',
          landmark: 'Near Hanuman Temple',
          coordinates: { latitude: 22.5646, longitude: 72.929 },
        },
        idempotencyKey: 'test-order-key-12345',
      }),
    });
    const data = await res.json();
    placedOrderId = data.order?._id;
    return data.success && data.order?.paymentMethod === 'COD' && data.order?.status === 'Order Placed';
  });

  // Test 13: Active Order retrieval
  await assert('GET /orders/active returns the in-progress order', async () => {
    const res = await fetch(`${baseUrl}/orders/active`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    return data.success && data.activeOrder?._id === placedOrderId;
  });

  // Test 14: Customer Profile Address Management
  await assert('POST /profile/addresses adds and saves customer address', async () => {
    const res = await fetch(`${baseUrl}/profile/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        houseNumber: '10',
        streetArea: 'Bazaar Peth',
        villageTown: 'Anand',
        landmark: 'Near Primary School',
        isDefault: true,
      }),
    });
    const data = await res.json();
    return data.success && data.addresses.length === 1;
  });

  console.log(`\n🏁 Tests summary: ${testPassed} passed, ${testFailed} failed.`);

  server.close();
  await disconnectDB();

  if (testFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
