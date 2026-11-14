import { connectDB, disconnectDB } from '../src/config/db';
import { cleanupMockCatalog } from '../src/utils/catalogCleanup';

async function run() {
  console.log('🧹 Starting standalone mock catalog cleanup...');
  await connectDB();
  const result = await cleanupMockCatalog();
  console.log('🏁 Cleanup finished:');
  console.log(`   - Unreferenced mock products deleted: ${result.removedProducts}`);
  console.log(`   - Ordered mock products archived:    ${result.archivedProducts}`);
  console.log(`   - Unused mock categories removed:     ${result.removedCategories}`);
  console.log(`   - In-use categories retained:         ${result.retainedCategories}`);
  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
