import { connectDB, disconnectDB } from '../src/config/db';
import { Admin } from '../src/models/Admin';
import bcrypt from 'bcryptjs';

async function main() {
  const email = (process.argv[2] || process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.argv[3] || process.env.ADMIN_PASSWORD || '';
  const name = process.argv[4] || process.env.ADMIN_NAME || 'QuickMart Store Admin';

  if (!email || !password) {
    console.error('❌ Error: Both admin email and password must be explicitly provided.');
    console.error('Usage: npx tsx scripts/create-admin.ts <email> <password> [name]');
    console.error('Or set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Error: Admin password must be at least 8 characters long.');
    process.exit(1);
  }

  console.log(`🔧 Provisioning admin account for: ${email}`);

  await connectDB();

  const existing = await Admin.findOne({ email });
  const hashedPassword = await bcrypt.hash(password, 10);

  if (existing) {
    existing.password = hashedPassword;
    existing.name = name;
    existing.isActive = true;
    await existing.save();
    console.log(`✅ Admin credentials successfully updated for ${email}`);
  } else {
    await Admin.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      isActive: true,
    });
    console.log(`✅ New Admin account successfully provisioned for ${email}`);
  }

  await disconnectDB();
}

main().catch((err) => {
  console.error('❌ Failed to provision admin account:', err.message);
  process.exit(1);
});
