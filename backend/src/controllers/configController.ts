import { Request, Response, NextFunction } from 'express';
import { DeliveryConfig } from '../models/DeliveryConfig';
import { env } from '../config/env';
import { isWithinDeliveryRadius, calculateDeliveryEta } from '../utils/geo';
import { z } from 'zod';

const validateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export async function getDeliveryConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let config = await DeliveryConfig.findOne();

    if (!config) {
      config = await DeliveryConfig.create({
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
    }

    res.status(200).json({
      success: true,
      config: {
        storeLocation: config.storeLocation,
        deliveryRadiusKm: config.deliveryRadiusKm,
        baseDeliveryFee: config.baseDeliveryFee,
        freeDeliveryThreshold: config.freeDeliveryThreshold,
        minOrderAmount: config.minOrderAmount,
        estimatedSpeedKmh: config.estimatedSpeedKmh,
        preparationTimeMinutes: config.preparationTimeMinutes,
        isAcceptingOrders: config.isAcceptingOrders,
        appVersion: config.appVersion,
        supportPhone: config.supportPhone,
        supportEmail: config.supportEmail,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function validateDeliveryLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { latitude, longitude } = validateLocationSchema.parse(req.body);

    let config = await DeliveryConfig.findOne();
    const storeLoc = config?.storeLocation || env.STORE_LOCATION;
    const radius = config?.deliveryRadiusKm || env.DELIVERY_RADIUS_KM;
    const speed = config?.estimatedSpeedKmh || env.ESTIMATED_SPEED_KMH;
    const prep = config?.preparationTimeMinutes || env.PREPARATION_TIME_MINUTES;

    const { isDeliverable, distanceKm } = isWithinDeliveryRadius(
      latitude,
      longitude,
      storeLoc.latitude,
      storeLoc.longitude,
      radius
    );

    const eta = calculateDeliveryEta(distanceKm, speed, prep);

    res.status(200).json({
      success: true,
      isDeliverable,
      distanceKm,
      estimatedMinutes: isDeliverable ? eta.estimatedMinutes : null,
      maxRadiusKm: radius,
      storeName: storeLoc.name,
      message: isDeliverable
        ? `Delivery available! Approximately ${eta.estimatedMinutes} mins away.`
        : `Sorry, QuickMart currently delivers within ${radius} km of our ${storeLoc.name}. You are ${distanceKm} km away. You may still browse products.`,
    });
  } catch (error) {
    next(error);
  }
}
