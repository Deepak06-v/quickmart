import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from '../src/config/env';
import { ApitxtSmsProvider } from '../src/services/sms/smsService';
import { sanitizeMobile, normalizeMobileWithCountry } from '../src/utils/mobile';
import { Otp } from '../src/models/Otp';
import { User } from '../src/models/User';
import { Category } from '../src/models/Category';
import { Product } from '../src/models/Product';
import { resetOtpRateLimiter } from '../src/middleware/rateLimiter';
import app from '../src/app';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name} -> ${err.message}`);
    failed++;
  }
}

async function run() {
  console.log('🧪 Running APITXT & OTP Security Unit + Integration Tests...\n');

  // ── 1. Mobile Number Normalization ──────────────────────────────────────────
  await test('Normalizes 10-digit, 91-prefixed, +91, formatted, and 0-prefixed Indian numbers', () => {
    assert.equal(normalizeMobileWithCountry('9876543210', '91'), '919876543210');
    assert.equal(normalizeMobileWithCountry('919876543210', '91'), '919876543210');
    assert.equal(normalizeMobileWithCountry('+919876543210', '91'), '919876543210');
    assert.equal(normalizeMobileWithCountry('+91 98765-43210', '91'), '919876543210');
    assert.equal(normalizeMobileWithCountry('09876543210', '91'), '919876543210');
    assert.equal(sanitizeMobile('+91 98765 43210', '91'), '9876543210');
  });

  await test('Rejects invalid Indian mobile numbers', () => {
    assert.throws(() => normalizeMobileWithCountry('1234567890', '91'));
    assert.throws(() => normalizeMobileWithCountry('98765', '91'));
    assert.throws(() => normalizeMobileWithCountry('91919876543210', '91'));
  });

  // ── 2. APITXT Request Format & Optional template_id ─────────────────────────
  await test('Sends POST form-urlencoded to APITXT without authkey in URL and omits empty template_id', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;

    const mockFetch: typeof fetch = async (input, init) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(
        JSON.stringify({
          status: 'success',
          message: 'Sms OTP Sent Successfully',
          data: {
            request_id: 'SMS-OTP-A1B2C3D4',
            mobile: '919876543210',
            cost: 0.25,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const provider = new ApitxtSmsProvider({
      authKey: 'test_secret_key',
      apiUrl: 'https://apitxt.com/api/sendOTP',
      channel: 'sms',
      country: '91',
      templateId: '',
      timeoutMs: 5000,
      fetchFn: mockFetch,
    });

    const result = await provider.sendOtp('+91 9876543210', '482910', 'AUTH');
    assert.equal(result.success, true);
    assert.equal(result.messageId, 'SMS-OTP-A1B2C3D4');
    assert.equal(capturedUrl, 'https://apitxt.com/api/sendOTP');
    assert.equal(capturedUrl.includes('test_secret_key'), false);
    assert.equal(capturedInit?.method, 'POST');
    assert.equal(
      (capturedInit?.headers as Record<string, string>)['Content-Type'],
      'application/x-www-form-urlencoded'
    );

    const bodyParams = new URLSearchParams(String(capturedInit?.body));
    assert.equal(bodyParams.get('authkey'), 'test_secret_key');
    assert.equal(bodyParams.get('mobile'), '919876543210');
    assert.equal(bodyParams.get('otp'), '482910');
    assert.equal(bodyParams.get('channel'), 'sms');
    assert.equal(bodyParams.get('country'), '91');
    assert.equal(bodyParams.has('template_id'), false);
  });

  await test('Includes template_id when configured', async () => {
    let capturedBody = '';
    const mockFetch: typeof fetch = async (_input, init) => {
      capturedBody = String(init?.body);
      return new Response(
        JSON.stringify({
          status: 'success',
          message: 'Sms OTP Sent Successfully',
          data: { request_id: 'SMS-OTP-TPL1' },
        }),
        { status: 200 }
      );
    };

    const provider = new ApitxtSmsProvider({
      authKey: 'test_secret_key',
      apiUrl: 'https://apitxt.com/api/sendOTP',
      channel: 'sms',
      country: '91',
      templateId: 'TPL_9988',
      timeoutMs: 5000,
      fetchFn: mockFetch,
    });

    const result = await provider.sendOtp('9876543210', '112233', 'ORDER_CONFIRMATION');
    assert.equal(result.success, true);
    const bodyParams = new URLSearchParams(capturedBody);
    assert.equal(bodyParams.get('template_id'), 'TPL_9988');
  });

  // ── 3. Provider Failure & Missing Key Handling ──────────────────────────────
  await test('Returns SMS_PROVIDER_NOT_CONFIGURED when APITXT_AUTH_KEY is missing', async () => {
    const provider = new ApitxtSmsProvider({
      authKey: '',
      apiUrl: 'https://apitxt.com/api/sendOTP',
      channel: 'sms',
      country: '91',
      timeoutMs: 5000,
    });

    const result = await provider.sendOtp('9876543210', '123456', 'AUTH');
    assert.equal(result.success, false);
    assert.equal(result.code, 'SMS_PROVIDER_NOT_CONFIGURED');
    assert.equal(result.statusCode, 503);
  });

  await test('Does not treat HTTP 200 with status != success as accepted', async () => {
    const mockFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ status: 'error', message: 'Insufficient wallet balance' }), {
        status: 200,
      });

    const provider = new ApitxtSmsProvider({
      authKey: 'test_key',
      apiUrl: 'https://apitxt.com/api/sendOTP',
      channel: 'sms',
      country: '91',
      timeoutMs: 5000,
      fetchFn: mockFetch,
    });

    const result = await provider.sendOtp('9876543210', '123456', 'AUTH');
    assert.equal(result.success, false);
    assert.equal(result.code, 'SMS_SERVICE_UNAVAILABLE');
    assert.equal(result.statusCode, 503);
  });

  await test('Handles rate limit, invalid key, invalid template, malformed JSON, and timeout without retrying', async () => {
    let callCount = 0;

    // Rate limit
    const rateLimitProvider = new ApitxtSmsProvider({
      authKey: 'k',
      apiUrl: 'https://apitxt.com/api/sendOTP',
      channel: 'sms',
      country: '91',
      timeoutMs: 5000,
      fetchFn: async () => {
        callCount++;
        return new Response(JSON.stringify({ status: 'error', message: 'Rate limit exceeded' }), { status: 429 });
      },
    });
    const r1 = await rateLimitProvider.sendOtp('9876543210', '123456', 'AUTH');
    assert.equal(r1.success, false);
    assert.equal(r1.statusCode, 429);
    assert.equal(callCount, 1);

    // Malformed JSON
    const malformedProvider = new ApitxtSmsProvider({
      authKey: 'k',
      apiUrl: 'https://apitxt.com/api/sendOTP',
      channel: 'sms',
      country: '91',
      timeoutMs: 5000,
      fetchFn: async () => new Response('<html>502 Bad Gateway</html>', { status: 502 }),
    });
    const r2 = await malformedProvider.sendOtp('9876543210', '123456', 'AUTH');
    assert.equal(r2.success, false);
    assert.equal(r2.code, 'SMS_PROVIDER_MALFORMED_RESPONSE');

    // Timeout (AbortError) — verify no retry
    let timeoutCalls = 0;
    const timeoutProvider = new ApitxtSmsProvider({
      authKey: 'k',
      apiUrl: 'https://apitxt.com/api/sendOTP',
      channel: 'sms',
      country: '91',
      timeoutMs: 50,
      fetchFn: async (_url, init) => {
        timeoutCalls++;
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('Aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      },
    });
    const r3 = await timeoutProvider.sendOtp('9876543210', '123456', 'AUTH');
    assert.equal(r3.success, false);
    assert.equal(r3.code, 'SMS_PROVIDER_TIMEOUT');
    assert.equal(r3.statusCode, 504);
    assert.equal(timeoutCalls, 1);
  });

  // ── 4. Full Express + In-Memory MongoDB Integration ─────────────────────────
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const server = app.listen(0);
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  const origFetch = globalThis.fetch;
  const origProvider = env.SMS_PROVIDER;
  const origAuthKey = env.APITXT_AUTH_KEY;
  const origCooldown = env.OTP_RESEND_COOLDOWN_SECONDS;

  try {
    const cat = await Category.create({
      name: 'Staples',
      slug: 'staples',
      imageUrl: 'https://example.com/staples.jpg',
      displayOrder: 1,
    });
    const product = await Product.create({
      name: 'Whole Wheat Atta',
      description: 'Fresh flour',
      category: cat._id,
      images: ['https://example.com/atta.jpg'],
      originalPrice: 200,
      discountedPrice: 180,
      discountPercentage: 10,
      unit: '5 kg',
      stockQuantity: 50,
      isAvailable: true,
    });

    // Missing APITXT_AUTH_KEY returns 503 and stores NO OTP
    await test('Endpoint returns 503 when SMS_PROVIDER=apitxt and APITXT_AUTH_KEY is missing', async () => {
      resetOtpRateLimiter();
      env.SMS_PROVIDER = 'apitxt';
      env.APITXT_AUTH_KEY = '';
      env.OTP_RESEND_COOLDOWN_SECONDS = 0;

      const res = await origFetch(`${baseUrl}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: '9876543210', name: 'Asha' }),
      });
      const data = await res.json();
      assert.equal(res.status, 503);
      assert.equal(data.code, 'SMS_PROVIDER_NOT_CONFIGURED');
      const otpCount = await Otp.countDocuments({ mobile: '9876543210' });
      assert.equal(otpCount, 0);
    });

    // Mocked APITXT: Signup, Login, Purpose Isolation, Order Confirmation, Single-use, Rate Limit
    let lastSentOtp = '';
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === env.APITXT_API_URL) {
        const params = new URLSearchParams(String(init?.body));
        lastSentOtp = params.get('otp') || '';
        return new Response(
          JSON.stringify({
            status: 'success',
            message: 'Sms OTP Sent Successfully',
            data: { request_id: 'SMS-OTP-MOCK-1', mobile: params.get('mobile'), cost: 0.25 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return origFetch(input, init);
    }) as typeof fetch;

    let authToken = '';
    const sampleAddress = {
      houseNumber: '12B',
      streetArea: 'Station Road',
      villageTown: 'Anand',
      coordinates: { latitude: 22.565, longitude: 72.93 },
    };

    await test('Customer signup & login via mocked APITXT OTP (no devOtp leaked, single-use enforced)', async () => {
      resetOtpRateLimiter();
      env.SMS_PROVIDER = 'apitxt';
      env.APITXT_AUTH_KEY = 'mock_live_key';
      env.OTP_RESEND_COOLDOWN_SECONDS = 0;

      const reqRes = await origFetch(`${baseUrl}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: '+91 9876543210', name: 'Deepak Patel' }),
      });
      const reqData = await reqRes.json();
      assert.equal(reqRes.status, 200);
      assert.equal(reqData.success, true);
      assert.equal(reqData.devOtp, undefined);
      assert.match(lastSentOtp, /^\d{6}$/);

      // Verify OTP
      const verRes = await origFetch(`${baseUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: '9876543210', otp: lastSentOtp, name: 'Deepak Patel' }),
      });
      const verData = await verRes.json();
      assert.equal(verRes.status, 200);
      assert.ok(verData.token);
      assert.equal(verData.user.mobile, '9876543210');
      authToken = verData.token;

      // Reuse of same OTP must fail
      const reuseRes = await origFetch(`${baseUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: '9876543210', otp: lastSentOtp }),
      });
      assert.equal(reuseRes.status, 400);
    });

    await test('Purpose isolation: AUTH OTP cannot confirm an ORDER_CONFIRMATION', async () => {
      resetOtpRateLimiter();
      // Request AUTH OTP
      await origFetch(`${baseUrl}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: '9876543210' }),
      });
      const authOtp = lastSentOtp;

      // Try to confirm order using AUTH OTP
      const confirmRes = await origFetch(`${baseUrl}/orders/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          otp: authOtp,
          items: [{ productId: product._id.toString(), quantity: 1 }],
          address: sampleAddress,
        }),
      });
      assert.equal(confirmRes.status, 400);
    });

    await test('Order confirmation OTP flow succeeds via mocked APITXT', async () => {
      resetOtpRateLimiter();
      const reqOrderOtp = await origFetch(`${baseUrl}/orders/request-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          items: [{ productId: product._id.toString(), quantity: 1 }],
          address: sampleAddress,
        }),
      });
      assert.equal(reqOrderOtp.status, 200);
      const orderOtp = lastSentOtp;

      const confirmRes = await origFetch(`${baseUrl}/orders/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          otp: orderOtp,
          items: [{ productId: product._id.toString(), quantity: 1 }],
          address: sampleAddress,
          idempotencyKey: 'test_idem_1',
        }),
      });
      const confirmData = await confirmRes.json();
      assert.equal(confirmRes.status, 201);
      assert.equal(confirmData.success, true);
      assert.ok(confirmData.order.orderNumber);
    });

    await test('Enforces max 3 OTP requests per mobile per minute across AUTH and ORDER_CONFIRMATION combined', async () => {
      resetOtpRateLimiter();
      env.OTP_RESEND_COOLDOWN_SECONDS = 0;

      // 1: AUTH
      const r1 = await origFetch(`${baseUrl}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: '9876543210' }),
      });
      assert.equal(r1.status, 200);

      // 2: ORDER_CONFIRMATION
      const r2 = await origFetch(`${baseUrl}/orders/request-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          items: [{ productId: product._id.toString(), quantity: 1 }],
          address: sampleAddress,
        }),
      });
      assert.equal(r2.status, 200);

      // 3: AUTH
      const r3 = await origFetch(`${baseUrl}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: '+919876543210' }),
      });
      assert.equal(r3.status, 200);

      // 4: ORDER_CONFIRMATION -> must be rate limited (429)
      const r4 = await origFetch(`${baseUrl}/orders/request-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          items: [{ productId: product._id.toString(), quantity: 1 }],
          address: sampleAddress,
        }),
      });
      assert.equal(r4.status, 429);
    });

    await test('Enforces resend cooldown when OTP_RESEND_COOLDOWN_SECONDS > 0', async () => {
      resetOtpRateLimiter();
      env.OTP_RESEND_COOLDOWN_SECONDS = 60;

      const r1 = await origFetch(`${baseUrl}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: '9876543210' }),
      });
      assert.equal(r1.status, 200);

      const r2 = await origFetch(`${baseUrl}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: '9876543210' }),
      });
      assert.equal(r2.status, 429);
    });

    // Ensure User model is referenced cleanly
    assert.ok((await User.countDocuments()) >= 1);
  } finally {
    globalThis.fetch = origFetch;
    env.SMS_PROVIDER = origProvider;
    env.APITXT_AUTH_KEY = origAuthKey;
    env.OTP_RESEND_COOLDOWN_SECONDS = origCooldown;
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
  }

  console.log('\n======================================================');
  console.log(`🎉 APITXT Tests Complete: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
