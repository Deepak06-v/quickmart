import { startServer } from '../src/app';
import { Server } from 'http';
import { disconnectDB } from '../src/config/db';
import { Product } from '../src/models/Product';
import { Category } from '../src/models/Category';
import { env, getDeliveryFeeConfig } from '../src/config/env';
import { calculateDeliveryFee } from '../src/utils/deliveryFee';
import { calculateDistanceKm } from '../src/utils/geo';
import { resetOtpRateLimiter } from '../src/middleware/rateLimiter';
import assert from 'assert';

async function runTests() {
  console.log('🧪 Starting Configurable Delivery Fee & Backend Order Validation Tests...\n');

  // Test 1: Unit calculation with default environment (Threshold: 2 km, <=2km: ₹10, >2km: ₹25)
  delete process.env.DELIVERY_FEE_THRESHOLD_KM;
  delete process.env.DELIVERY_FEE_AT_OR_BELOW_THRESHOLD;
  delete process.env.DELIVERY_FEE_ABOVE_THRESHOLD;

  console.log('1. Testing calculation with default configuration (2 km threshold, ₹10 / ₹25):');
  
  // 0.5 km (below)
  assert.strictEqual(calculateDeliveryFee(0.5), 10, 'Fee at 0.5 km should be ₹10');
  console.log('  ✅ PASS: 0.5 km (below threshold) -> ₹10');

  // 1.0 km (below)
  assert.strictEqual(calculateDeliveryFee(1.0), 10, 'Fee at 1.0 km should be ₹10');
  console.log('  ✅ PASS: 1.0 km (below threshold) -> ₹10');

  // 1.9 km (just below)
  assert.strictEqual(calculateDeliveryFee(1.9), 10, 'Fee at 1.9 km should be ₹10');
  console.log('  ✅ PASS: 1.9 km (just below threshold) -> ₹10');

  // 2.0 km (exactly at threshold)
  assert.strictEqual(calculateDeliveryFee(2.0), 10, 'Fee at 2.0 km should be ₹10');
  console.log('  ✅ PASS: 2.0 km (exactly at threshold) -> ₹10');

  // 2.1 km (slightly above threshold)
  assert.strictEqual(calculateDeliveryFee(2.1), 25, 'Fee at 2.1 km should be ₹25');
  console.log('  ✅ PASS: 2.1 km (slightly above threshold) -> ₹25');

  // 3.0 km (above threshold)
  assert.strictEqual(calculateDeliveryFee(3.0), 25, 'Fee at 3.0 km should be ₹25');
  console.log('  ✅ PASS: 3.0 km (above threshold) -> ₹25');

  // 5.0 km (much larger distance)
  assert.strictEqual(calculateDeliveryFee(5.0), 25, 'Fee at 5.0 km should be ₹25');
  console.log('  ✅ PASS: 5.0 km (much larger distance) -> ₹25');

  // Test 2: Dynamic reconfiguration via environment variables without code modification
  console.log('\n2. Testing dynamic environment reconfiguration (Threshold: 3 km, <=3km: ₹15, >3km: ₹30):');
  process.env.DELIVERY_FEE_THRESHOLD_KM = '3';
  process.env.DELIVERY_FEE_AT_OR_BELOW_THRESHOLD = '15';
  process.env.DELIVERY_FEE_ABOVE_THRESHOLD = '30';

  assert.strictEqual(calculateDeliveryFee(2.5), 15, 'At 2.5 km with 3km threshold, fee should now be ₹15');
  console.log('  ✅ PASS: 2.5 km with updated 3km threshold -> ₹15');

  assert.strictEqual(calculateDeliveryFee(3.0), 15, 'At exactly 3.0 km, fee should be ₹15');
  console.log('  ✅ PASS: 3.0 km (at new threshold) -> ₹15');

  assert.strictEqual(calculateDeliveryFee(3.1), 30, 'At 3.1 km, fee should now be ₹30');
  console.log('  ✅ PASS: 3.1 km (above new threshold) -> ₹30');

  // Test 3: Validation of invalid environment variables
  console.log('\n3. Testing invalid environment variable protection:');
  
  // Non-positive threshold
  process.env.DELIVERY_FEE_THRESHOLD_KM = '0';
  assert.throws(() => getDeliveryFeeConfig(), /Threshold must be a positive number/, 'Should reject 0 threshold');
  console.log('  ✅ PASS: Rejects DELIVERY_FEE_THRESHOLD_KM = 0');

  process.env.DELIVERY_FEE_THRESHOLD_KM = '-2';
  assert.throws(() => getDeliveryFeeConfig(), /Threshold must be a positive number/, 'Should reject negative threshold');
  console.log('  ✅ PASS: Rejects negative DELIVERY_FEE_THRESHOLD_KM');

  process.env.DELIVERY_FEE_THRESHOLD_KM = 'invalid_number';
  assert.throws(() => getDeliveryFeeConfig(), /Threshold must be a positive number/, 'Should reject non-numeric threshold');
  console.log('  ✅ PASS: Rejects non-numeric DELIVERY_FEE_THRESHOLD_KM');

  // Negative fees
  process.env.DELIVERY_FEE_THRESHOLD_KM = '2';
  process.env.DELIVERY_FEE_AT_OR_BELOW_THRESHOLD = '-10';
  assert.throws(() => getDeliveryFeeConfig(), /Fee must be a non-negative amount/, 'Should reject negative fee');
  console.log('  ✅ PASS: Rejects negative DELIVERY_FEE_AT_OR_BELOW_THRESHOLD');

  process.env.DELIVERY_FEE_AT_OR_BELOW_THRESHOLD = '10';
  process.env.DELIVERY_FEE_ABOVE_THRESHOLD = '-25';
  assert.throws(() => getDeliveryFeeConfig(), /Fee must be a non-negative amount/, 'Should reject negative above-threshold fee');
  console.log('  ✅ PASS: Rejects negative DELIVERY_FEE_ABOVE_THRESHOLD');

  // Reset to default production values
  process.env.DELIVERY_FEE_THRESHOLD_KM = '2';
  process.env.DELIVERY_FEE_AT_OR_BELOW_THRESHOLD = '10';
  process.env.DELIVERY_FEE_ABOVE_THRESHOLD = '25';

  // Test 4: End-to-end API integration tests
  console.log('\n4. Testing API Endpoints & Server Order Validation with In-Memory DB:');
  process.env.USE_IN_MEMORY_DB = 'true';
  process.env.PORT = '5009';
  env.PORT = 5009;

  const server: Server = await startServer();
  const baseUrl = 'http://localhost:5009/api';

  try {
    // Seed test category and product
    await Product.deleteMany({});
    await Category.deleteMany({});

    const cat = await Category.create({
      name: 'Fresh Fruits',
      slug: 'fruits',
      imageUrl: 'https://example.com/fruit.jpg',
      displayOrder: 1,
    });

    const product = await Product.create({
      name: 'Sweet Bananas',
      description: 'Fresh local bananas',
      category: cat._id,
      images: ['https://example.com/banana.jpg'],
      originalPrice: 60,
      discountedPrice: 50,
      discountPercentage: 16,
      unit: '1 dozen',
      stockQuantity: 50,
      isAvailable: true,
      isFeatured: true,
      isOffer: false,
      tags: ['banana', 'fruit'],
    });

    // 4.1 Validate Location API (below threshold: 22.5645, 72.9289 is store hub, dist = 0km <= 2km)
    const locResBelow = await fetch(`${baseUrl}/config/validate-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: 22.5645, longitude: 72.9289 }),
    });
    const locDataBelow = await locResBelow.json();
    assert.strictEqual(locResBelow.status, 200);
    assert.strictEqual(locDataBelow.deliveryFee, 10, 'Store location (0 km) delivery fee should be ₹10');
    console.log(`  ✅ PASS: POST /config/validate-location at 0.0 km -> deliveryFee = ₹${locDataBelow.deliveryFee}`);

    // 4.2 Validate Location API (above threshold: Mogar village ~6.7km > 2km)
    const locResAbove = await fetch(`${baseUrl}/config/validate-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: 22.518, longitude: 72.972 }),
    });
    const locDataAbove = await locResAbove.json();
    assert.strictEqual(locResAbove.status, 200);
    assert.strictEqual(locDataAbove.deliveryFee, 25, 'Mogar village (6.7 km) delivery fee should be ₹25');
    console.log(`  ✅ PASS: POST /config/validate-location at ${locDataAbove.distanceKm} km -> deliveryFee = ₹${locDataAbove.deliveryFee}`);

    // 4.3 Validate Location API (outside delivery radius > 15km)
    const locResOutside = await fetch(`${baseUrl}/config/validate-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: 22.41, longitude: 72.901 }), // ~17.4 km away
    });
    const locDataOutside = await locResOutside.json();
    assert.strictEqual(locResOutside.status, 200);
    assert.strictEqual(locDataOutside.isDeliverable, false);
    assert.strictEqual(locDataOutside.deliveryFee, null, 'Outside zone fee should be null');
    console.log('  ✅ PASS: POST /config/validate-location outside radius -> isDeliverable = false, deliveryFee = null');

    // 4.4 Validate Cart API (missing coordinates)
    const cartResNoCoords = await fetch(`${baseUrl}/cart/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: product._id.toString(), quantity: 2 }],
      }),
    });
    const cartDataNoCoords = await cartResNoCoords.json();
    assert.strictEqual(cartResNoCoords.status, 200);
    assert.strictEqual(cartDataNoCoords.deliveryFee, null, 'Without coordinates, deliveryFee must be null');
    console.log('  ✅ PASS: POST /cart/validate without coordinates -> deliveryFee = null, prompts location selection');

    // 4.5 Validate Cart API (with nearby coordinates <= 2km)
    const cartResNearby = await fetch(`${baseUrl}/cart/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: product._id.toString(), quantity: 2 }],
        coordinates: { latitude: 22.5645, longitude: 72.9289 },
      }),
    });
    const cartDataNearby = await cartResNearby.json();
    assert.strictEqual(cartResNearby.status, 200);
    assert.strictEqual(cartDataNearby.subtotal, 100);
    assert.strictEqual(cartDataNearby.deliveryFee, 10);
    assert.strictEqual(cartDataNearby.totalAmount, 110, 'Subtotal ₹100 + fee ₹10 should equal ₹110');
    console.log('  ✅ PASS: POST /cart/validate nearby -> subtotal ₹100 + fee ₹10 = total ₹110');

    // 4.6 Validate Cart API (with far coordinates > 2km)
    const cartResFar = await fetch(`${baseUrl}/cart/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: product._id.toString(), quantity: 2 }],
        coordinates: { latitude: 22.518, longitude: 72.972 },
      }),
    });
    const cartDataFar = await cartResFar.json();
    assert.strictEqual(cartResFar.status, 200);
    assert.strictEqual(cartDataFar.subtotal, 100);
    assert.strictEqual(cartDataFar.deliveryFee, 25);
    assert.strictEqual(cartDataFar.totalAmount, 125, 'Subtotal ₹100 + fee ₹25 should equal ₹125');
    console.log('  ✅ PASS: POST /cart/validate far -> subtotal ₹100 + fee ₹25 = total ₹125');

    // 4.7 Customer Auth for Order Placement
    resetOtpRateLimiter();
    const authReq = await fetch(`${baseUrl}/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876543210' }),
    });
    const authReqData = await authReq.json();
    const verifyRes = await fetch(`${baseUrl}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876543210', otp: authReqData.devOtp }),
    });
    const verifyData = await verifyRes.json();
    const token = verifyData.token;

    // 4.8 Order placement with missing coordinates rejected
    resetOtpRateLimiter();
    const orderOtpMissingCoords = await fetch(`${baseUrl}/orders/request-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items: [{ productId: product._id.toString(), quantity: 2 }],
        address: {
          houseNumber: '12',
          streetArea: 'Station Road',
          villageTown: 'Anand',
        },
      }),
    });
    assert.strictEqual(orderOtpMissingCoords.status, 400);
    console.log('  ✅ PASS: POST /orders/request-otp rejects missing coordinates with 400');

    // 4.9 Order placement with valid coordinates <= 2km stores fee = ₹10
    resetOtpRateLimiter();
    const orderOtpNearby = await fetch(`${baseUrl}/orders/request-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items: [{ productId: product._id.toString(), quantity: 2 }],
        address: {
          houseNumber: '12',
          streetArea: 'Station Road',
          villageTown: 'Anand',
          coordinates: { latitude: 22.5645, longitude: 72.9289 },
        },
      }),
    });
    const orderOtpData = await orderOtpNearby.json();
    assert.strictEqual(orderOtpNearby.status, 200);

    const confirmResNearby = await fetch(`${baseUrl}/orders/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        otp: orderOtpData.devOtp,
        items: [{ productId: product._id.toString(), quantity: 2 }],
        address: {
          houseNumber: '12',
          streetArea: 'Station Road',
          villageTown: 'Anand',
          coordinates: { latitude: 22.5645, longitude: 72.9289 },
        },
        idempotencyKey: 'test_order_nearby_1',
      }),
    });
    const confirmDataNearby = await confirmResNearby.json();
    assert.strictEqual(confirmResNearby.status, 201);
    assert.strictEqual(confirmDataNearby.order.subtotal, 100);
    assert.strictEqual(confirmDataNearby.order.deliveryFee, 10, 'Nearby order deliveryFee must be ₹10');
    assert.strictEqual(confirmDataNearby.order.totalAmount, 110, 'Nearby order totalAmount must be ₹110');
    console.log(`  ✅ PASS: Order created: subtotal ₹100, fee ₹${confirmDataNearby.order.deliveryFee}, total ₹${confirmDataNearby.order.totalAmount}`);

    // 4.10 Changing configuration dynamically does NOT modify existing order's stored fee
    process.env.DELIVERY_FEE_AT_OR_BELOW_THRESHOLD = '50'; // simulate admin changing fee in env
    const orderDetailsRes = await fetch(`${baseUrl}/orders/${confirmDataNearby.order._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const orderDetails = await orderDetailsRes.json();
    assert.strictEqual(orderDetails.order.deliveryFee, 10, 'Existing order delivery fee must remain ₹10');
    console.log('  ✅ PASS: Changing environment fee does not alter existing order delivery fee (remains ₹10)');

    // Reset env
    process.env.DELIVERY_FEE_AT_OR_BELOW_THRESHOLD = '10';

    console.log('\n🏁 All Delivery Fee & Order Validation Tests Passed Successfully!');
  } finally {
    server.close();
    await disconnectDB();
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
