import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { env } from './config/env';
import { connectDB } from './config/db';
import { autoSeedIfEmpty } from './utils/autoSeed';
import apiRoutes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security and middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow images to be loaded on mobile
  })
);
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static directory for uploaded profile images and assets
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Root health check endpoint for cloud platform health checks
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'QuickMart Hyperlocal Grocery API',
  });
});

// Mount API routes
app.use('/api', apiRoutes);

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.method} ${req.originalUrl} not found.`,
  });
});

// Centralized error handler
app.use(errorHandler);

// Start server function
export async function startServer() {
  await connectDB();
  await autoSeedIfEmpty();
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`\n🚀 QuickMart Hyperlocal Backend is running on port ${env.PORT}`);
    console.log(`🌐 Base URL: http://localhost:${env.PORT}`);
    console.log(`📦 Health check: http://localhost:${env.PORT}/api/health`);
    console.log(`⚙️  Environment: ${env.NODE_ENV}`);
    console.log(`📱 SMS Provider: ${env.SMS_PROVIDER}\n`);
  });
  return server;
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default app;
