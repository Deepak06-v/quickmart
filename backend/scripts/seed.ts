import { connectDB, disconnectDB } from '../src/config/db';
import { ensureDeliveryConfig } from '../src/utils/ensureDeliveryConfig';

async function seed() {
  console.log('ℹ️  Mock product and category seeding has been permanently disabled.');
  console.log('📦 All products and categories must be created and managed via the Admin Dashboard.');
  console.log('⚙️  Ensuring store delivery configuration...');
  await connectDB();
  await ensureDeliveryConfig();
  console.log('✅ Store delivery configuration verified.');
  await disconnectDB();
}

seed().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
