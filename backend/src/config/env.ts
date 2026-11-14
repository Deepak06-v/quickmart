import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quickmart',
  USE_IN_MEMORY_DB: process.env.USE_IN_MEMORY_DB === 'true',
  JWT_SECRET: process.env.JWT_SECRET || 'quickmart_super_secure_jwt_secret_dev_2026_change_in_prod',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',

  ADMIN_EMAIL: (process.env.ADMIN_EMAIL || '').toLowerCase().trim(),
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
  ADMIN_NAME: (process.env.ADMIN_NAME || 'Store Owner').trim(),

  SMS_PROVIDER: (process.env.SMS_PROVIDER || 'dev') as 'dev' | 'apitxt' | 'fast2sms' | 'msg91' | 'twilio',
  SMS_API_KEY: process.env.SMS_API_KEY || '',
  SMS_SENDER_ID: process.env.SMS_SENDER_ID || 'QKMART',

  APITXT_AUTH_KEY: process.env.APITXT_AUTH_KEY || '',
  APITXT_API_URL: process.env.APITXT_API_URL || 'https://apitxt.com/api/sendOTP',
  APITXT_CHANNEL: process.env.APITXT_CHANNEL || 'sms',
  APITXT_COUNTRY: process.env.APITXT_COUNTRY || '91',
  APITXT_TEMPLATE_ID: process.env.APITXT_TEMPLATE_ID || '',
  APITXT_TIMEOUT_MS: parseInt(process.env.APITXT_TIMEOUT_MS || '15000', 10),

  OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
  OTP_MAX_ATTEMPTS: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
  OTP_RESEND_COOLDOWN_SECONDS: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10),

  STORE_LOCATION: {
    latitude: parseFloat(process.env.STORE_LATITUDE || '22.5645'),
    longitude: parseFloat(process.env.STORE_LONGITUDE || '72.9289'),
    name: process.env.STORE_NAME || 'QuickMart Rural Fulfillment Hub',
    address: process.env.STORE_ADDRESS || 'Main Market Road, Rural Distribution Hub 388001',
  },

  DELIVERY_RADIUS_KM: parseFloat(process.env.DELIVERY_RADIUS_KM || '15'),
  BASE_DELIVERY_FEE: parseFloat(process.env.BASE_DELIVERY_FEE || '25'),
  FREE_DELIVERY_THRESHOLD: parseFloat(process.env.FREE_DELIVERY_THRESHOLD || '299'),
  MIN_ORDER_AMOUNT: parseFloat(process.env.MIN_ORDER_AMOUNT || '99'),
  ESTIMATED_SPEED_KMH: parseFloat(process.env.ESTIMATED_SPEED_KMH || '25'),
  PREPARATION_TIME_MINUTES: parseInt(process.env.PREPARATION_TIME_MINUTES || '15', 10),
};
