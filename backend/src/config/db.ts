import mongoose from 'mongoose';
import { env } from './env';

let mongodInstance: any = null;

export async function connectDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  try {
    if (env.USE_IN_MEMORY_DB) {
      console.log('🔄 Initializing in-memory MongoDB server for testing/development...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      const memoryUri = mongodInstance.getUri();
      console.log(`✅ In-memory MongoDB running at: ${memoryUri}`);
      await mongoose.connect(memoryUri);
      console.log('✅ Connected to in-memory MongoDB database.');
      return;
    }

    // Try connecting to configured MONGODB_URI
    console.log(`🔄 Connecting to MongoDB at ${env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@')}...`);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log('✅ Connected to MongoDB successfully.');
  } catch (error: any) {
    if (env.NODE_ENV === 'production') {
      console.error(`❌ Fatal: Failed to connect to MongoDB Atlas in production: ${error.message}`);
      throw error;
    }
    console.warn(`⚠️ Failed to connect to configured MongoDB (${error.message}). Falling back to MongoMemoryServer...`);
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      const fallbackUri = mongodInstance.getUri();
      console.log(`✅ Started fallback MongoMemoryServer at: ${fallbackUri}`);
      await mongoose.connect(fallbackUri);
      console.log('✅ Connected to fallback MongoDB instance.');
    } catch (innerError: any) {
      console.error('❌ Could not start in-memory MongoDB either:', innerError.message);
      throw innerError;
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
}
