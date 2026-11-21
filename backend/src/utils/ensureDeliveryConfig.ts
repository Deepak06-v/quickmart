import { DeliveryConfig } from '../models/DeliveryConfig';
import { env } from '../config/env';

/**
 * Ensures the store delivery configuration exists in MongoDB.
 * Does NOT seed or touch any products or categories.
 */
export async function ensureDeliveryConfig(): Promise<void> {
  const config = await DeliveryConfig.findOne();
  if (!config) {
    await DeliveryConfig.create({
      storeLocation: env.STORE_LOCATION,
      deliveryRadiusKm: env.DELIVERY_RADIUS_KM,
      baseDeliveryFee: env.BASE_DELIVERY_FEE,
      freeDeliveryThreshold: env.FREE_DELIVERY_THRESHOLD,
      minOrderAmount: env.MIN_ORDER_AMOUNT,
      estimatedSpeedKmh: env.ESTIMATED_SPEED_KMH,
      preparationTimeMinutes: env.PREPARATION_TIME_MINUTES,
      isAcceptingOrders: true,
      appVersion: '1.0.0',
      supportPhone: env.SUPPORT_PHONE,
      supportEmail: env.SUPPORT_EMAIL,
      privacyEmail: env.PRIVACY_EMAIL,
      whatsappNumber: env.WHATSAPP_NUMBER,
    });
    console.log('⚙️  [Delivery Config] Initialized store delivery parameters.');
  } else {
    // Keep support contact parameters synced with latest environment settings
    let changed = false;
    if (config.supportPhone !== env.SUPPORT_PHONE) {
      config.supportPhone = env.SUPPORT_PHONE;
      changed = true;
    }
    if (config.supportEmail !== env.SUPPORT_EMAIL) {
      config.supportEmail = env.SUPPORT_EMAIL;
      changed = true;
    }
    if (config.privacyEmail !== env.PRIVACY_EMAIL) {
      config.privacyEmail = env.PRIVACY_EMAIL;
      changed = true;
    }
    if (config.whatsappNumber !== env.WHATSAPP_NUMBER) {
      config.whatsappNumber = env.WHATSAPP_NUMBER;
      changed = true;
    }
    if (changed) {
      await config.save();
      console.log('⚙️  [Delivery Config] Synchronized contact information from environment.');
    }
  }
}
