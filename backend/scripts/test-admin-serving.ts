import { startServer } from '../src/app';
import { Server } from 'http';
import { disconnectDB } from '../src/config/db';
import { env } from '../src/config/env';

async function runServingTests() {
  console.log('🧪 Starting Admin Static & SPA Serving Verification Tests...\n');
  process.env.USE_IN_MEMORY_DB = 'true';
  process.env.PORT = '5003';
  env.PORT = 5003;

  const server: Server = await startServer();
  const host = 'http://localhost:5003';

  let passed = 0;
  let failed = 0;

  async function check(desc: string, fn: () => Promise<boolean>) {
    try {
      const ok = await fn();
      if (ok) {
        console.log(`  ✅ PASS: ${desc}`);
        passed++;
      } else {
        console.error(`  ❌ FAIL: ${desc}`);
        failed++;
      }
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${desc} -> error: ${err.message}`);
      failed++;
    }
  }

  // 1. Health check
  await check('GET /health returns 200 ok', async () => {
    const res = await fetch(`${host}/health`);
    const data = await res.json();
    return res.status === 200 && data.status === 'ok';
  });

  // 2. API Health check
  await check('GET /api/health returns 200 ok', async () => {
    const res = await fetch(`${host}/api/health`);
    const data = await res.json();
    return res.status === 200 && data.status === 'ok';
  });

  // 3. Root redirect
  await check('GET / redirects to /admin', async () => {
    const res = await fetch(`${host}/`, { redirect: 'manual' });
    return res.status === 302 && (res.headers.get('location') === '/admin' || res.headers.get('location')?.endsWith('/admin'));
  });

  // 4. Admin base URL
  await check('GET /admin serves Admin SPA index.html', async () => {
    const res = await fetch(`${host}/admin`);
    const html = await res.text();
    return res.status === 200 && html.includes('QuickMart') && html.includes('id="root"');
  });

  // 5. Admin nested SPA route (prevent 404 on refresh)
  await check('GET /admin/orders serves Admin SPA index.html (SPA Fallback)', async () => {
    const res = await fetch(`${host}/admin/orders`);
    const html = await res.text();
    return res.status === 200 && html.includes('QuickMart') && html.includes('id="root"');
  });

  // 6. Admin nested SPA route for products
  await check('GET /admin/catalog serves Admin SPA index.html (SPA Fallback)', async () => {
    const res = await fetch(`${host}/admin/catalog`);
    const html = await res.text();
    return res.status === 200 && html.includes('QuickMart') && html.includes('id="root"');
  });

  // 7. Admin nested SPA route for customers
  await check('GET /admin/customers serves Admin SPA index.html (SPA Fallback)', async () => {
    const res = await fetch(`${host}/admin/customers`);
    const html = await res.text();
    return res.status === 200 && html.includes('QuickMart') && html.includes('id="root"');
  });

  console.log(`\n🏁 Admin Serving summary: ${passed} passed, ${failed} failed.`);

  server.close();
  await disconnectDB();

  if (failed > 0) {
    process.exit(1);
  }
}

runServingTests().catch((err) => {
  console.error('Fatal serving test error:', err);
  process.exit(1);
});
