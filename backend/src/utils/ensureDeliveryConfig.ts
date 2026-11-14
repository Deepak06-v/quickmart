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
      supportPhone: '+91 98765 43210',
      supportEmail: 'support@quickmart.in',
    });
    console.log('⚙️  [Delivery Config] Initialized store delivery parameters.');
  }
}
