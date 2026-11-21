import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { env, getDeliveryFeeConfig } from './config/env';
import { connectDB } from './config/db';
import { syncAdminFromEnv } from './utils/syncAdmin';
import { ensureDeliveryConfig } from './utils/ensureDeliveryConfig';
import { cleanupMockCatalog } from './utils/catalogCleanup';
import apiRoutes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security and middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow images to be loaded on mobile
    contentSecurityPolicy: false, // Allow Vite Admin UI scripts and assets to load without restriction
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

// Public Privacy Policy page for Google Play compliance (dynamically uses backend env contact info)
const privacyHtmlPath = path.resolve(__dirname, 'public/privacy.html');
app.get('/privacy', (_req, res) => {
  if (fs.existsSync(privacyHtmlPath)) {
    let content = fs.readFileSync(privacyHtmlPath, 'utf8');
    content = content
      .replace(/privacy@quickmart\.in/g, env.PRIVACY_EMAIL)
      .replace(/support@quickmart\.in/g, env.SUPPORT_EMAIL)
      .replace(/\+91 98765 43210/g, env.SUPPORT_PHONE)
      .replace(/Main Market Road, Anand 388001, Gujarat, India/g, env.STORE_LOCATION.address);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(content);
  } else {
    res.status(200).send(`<h1>QuickMart Privacy Policy</h1><p>Contact ${env.PRIVACY_EMAIL} for disclosures.</p>`);
  }
});

// Public Account Deletion page for Google Play compliance (dynamically uses backend env contact info)
const deleteAccountHtmlPath = path.resolve(__dirname, 'public/delete-account.html');
app.get(['/delete-account', '/account-deletion'], (_req, res) => {
  if (fs.existsSync(deleteAccountHtmlPath)) {
    let content = fs.readFileSync(deleteAccountHtmlPath, 'utf8');
    content = content
      .replace(/privacy@quickmart\.in/g, env.PRIVACY_EMAIL)
      .replace(/support@quickmart\.in/g, env.SUPPORT_EMAIL);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(content);
  } else {
    res.status(200).send(`<h1>QuickMart Account Deletion</h1><p>Contact ${env.PRIVACY_EMAIL} to request deletion.</p>`);
  }
});

// Admin Web Application static hosting
const adminDistPath = path.resolve(__dirname, '../admin-ui/dist');
app.use('/admin', express.static(adminDistPath));

// SPA fallback for all /admin routes
app.get(['/admin', '/admin/*'], (_req, res, next) => {
  const indexPath = path.join(adminDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    next();
  }
});

// Root route redirect to /admin
app.get('/', (_req, res) => {
  res.redirect('/admin');
});

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
  await syncAdminFromEnv();
  await ensureDeliveryConfig();
  await cleanupMockCatalog();
  const feeCfg = getDeliveryFeeConfig();
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`\n🚀 QuickMart Hyperlocal Backend is running on port ${env.PORT}`);
    console.log(`🌐 Base URL: http://localhost:${env.PORT}`);
    console.log(`📦 Health check: http://localhost:${env.PORT}/api/health`);
    console.log(`⚙️  Environment: ${env.NODE_ENV}`);
    console.log(`🚚 Delivery Fee: <= ${feeCfg.thresholdKm} km: ₹${feeCfg.feeAtOrBelow}, > ${feeCfg.thresholdKm} km: ₹${feeCfg.feeAbove}`);
    console.log(`📞 Contact Support: ${env.SUPPORT_PHONE} | ${env.SUPPORT_EMAIL} (Privacy: ${env.PRIVACY_EMAIL})`);
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
