import { startServer } from '../src/app';
import { Server } from 'http';
import { disconnectDB } from '../src/config/db';
import { Admin } from '../src/models/Admin';
import { syncAdminFromEnv } from '../src/utils/syncAdmin';
import { resetAdminLoginRateLimiter } from '../src/controllers/adminAuthController';
import { env } from '../src/config/env';

async function runEnvSyncTests() {
  console.log('🧪 Starting Environment Variable Admin Sync Verification Tests...\n');
  process.env.USE_IN_MEMORY_DB = 'true';
  process.env.PORT = '5004';
  env.PORT = 5004;

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

  // 1. Missing or invalid env configuration does not create an account
  delete process.env.ADMIN_EMAIL;
  delete process.env.ADMIN_PASSWORD;
  env.ADMIN_EMAIL = '';
  env.ADMIN_PASSWORD = '';

  const server: Server = await startServer();
  const baseUrl = `http://localhost:5004/api`;

  await Admin.deleteMany({});
  resetAdminLoginRateLimiter();

  await assert('Missing environment configuration does not create any admin account', async () => {
    await syncAdminFromEnv();
    const count = await Admin.countDocuments();
    return count === 0;
  });

  // 2. Set environment variables and verify automatic creation
  const testEmail = 'owner@quickmart.in';
  const initialPassword = 'InitialSecurePassword123!';
  const testName = 'QuickMart Store Owner';

  process.env.ADMIN_EMAIL = testEmail;
  process.env.ADMIN_PASSWORD = initialPassword;
  process.env.ADMIN_NAME = testName;

  await assert('Admin account is automatically created from environment variables', async () => {
    await syncAdminFromEnv();
    const admin = await Admin.findOne({ email: testEmail });
    return !!admin && admin.name === testName && admin.role === 'admin';
  });

  // 3. Plaintext password is never stored in MongoDB
  await assert('Plaintext password is NEVER stored in MongoDB (bcrypt hash verified)', async () => {
    const admin = await Admin.findOne({ email: testEmail });
    if (!admin) return false;
    const isPlaintext = admin.password === initialPassword;
    const isBcrypt = admin.password.startsWith('$2a$') || admin.password.startsWith('$2b$');
    return !isPlaintext && isBcrypt;
  });

  // 4. Configured credentials allow login
  await assert('Login with configured ADMIN_EMAIL & ADMIN_PASSWORD succeeds (200 + JWT)', async () => {
    const res = await fetch(`${baseUrl}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: initialPassword,
      }),
    });
    const data = await res.json();
    return data.success && !!data.token && data.admin.email === testEmail;
  });

  // 5. Restarting/re-running does not create duplicate admin accounts (idempotence)
  await assert('Re-running synchronization does not create duplicate admin accounts', async () => {
    await syncAdminFromEnv();
    await syncAdminFromEnv();
    const count = await Admin.countDocuments({ email: testEmail });
    return count === 1;
  });

  // 6. Changing ADMIN_PASSWORD in environment and syncing updates password
  const updatedPassword = 'NewRotatedPassword456!';
  process.env.ADMIN_PASSWORD = updatedPassword;

  await assert('Changing ADMIN_PASSWORD in environment updates password in database', async () => {
    await syncAdminFromEnv();
    const admin = await Admin.findOne({ email: testEmail });
    if (!admin) return false;
    const matchesNew = await admin.comparePassword(updatedPassword);
    const count = await Admin.countDocuments({ email: testEmail });
    return matchesNew && count === 1;
  });

  // 7. Previous password no longer works
  resetAdminLoginRateLimiter();
  await assert('Previous password no longer works after environment password change (401)', async () => {
    const res = await fetch(`${baseUrl}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: initialPassword, // Old password
      }),
    });
    return res.status === 401;
  });

  // 8. New password logs in successfully
  resetAdminLoginRateLimiter();
  await assert('New password logs in successfully (200 + JWT)', async () => {
    const res = await fetch(`${baseUrl}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: updatedPassword, // New password
      }),
    });
    const data = await res.json();
    return data.success && !!data.token;
  });

  // 9. Changing ADMIN_NAME in environment updates name
  const updatedName = 'Chief Grocery Executive';
  process.env.ADMIN_NAME = updatedName;
  await assert('Changing ADMIN_NAME updates admin name without affecting password', async () => {
    await syncAdminFromEnv();
    const admin = await Admin.findOne({ email: testEmail });
    if (!admin) return false;
    const matchesPassword = await admin.comparePassword(updatedPassword);
    return admin.name === updatedName && matchesPassword;
  });

  // Clean up
  await Admin.deleteMany({});
  server.close();
  await disconnectDB();

  console.log(`\n🏁 Environment Admin Sync Summary: ${testPassed} passed, ${testFailed} failed.`);

  if (testFailed > 0) {
    process.exit(1);
  }
}

runEnvSyncTests().catch((err) => {
  console.error('Fatal sync test error:', err);
  process.exit(1);
});
