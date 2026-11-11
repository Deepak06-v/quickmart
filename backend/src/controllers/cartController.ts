import { Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product';
import { DeliveryConfig } from '../models/DeliveryConfig';
import { env } from '../config/env';
import { isWithinDeliveryRadius, calculateDeliveryEta } from '../utils/geo';
import { z } from 'zod';

const validateCartSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1).max(20),
    })
  ),
  coordinates: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
});

export async function validateCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { items, coordinates } = validateCartSchema.parse(req.body);

    if (items.length === 0) {
      res.status(200).json({
        success: true,
        items: [],
        subtotal: 0,
        deliveryFee: 0,
        totalAmount: 0,
        itemCount: 0,
        isDeliverable: true,
      });
      return;
    }

    const config = (await DeliveryConfig.findOne()) || {
      storeLocation: env.STORE_LOCATION,
      deliveryRadiusKm: env.DELIVERY_RADIUS_KM,
      baseDeliveryFee: env.BASE_DELIVERY_FEE,
      freeDeliveryThreshold: env.FREE_DELIVERY_THRESHOLD,
      minOrderAmount: env.MIN_ORDER_AMOUNT,
      estimatedSpeedKmh: env.ESTIMATED_SPEED_KMH,
      preparationTimeMinutes: env.PREPARATION_TIME_MINUTES,
    };

    const productIds = items.map((i) => i.productId);
    const dbProducts = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(dbProducts.map((p) => [p._id.toString(), p]));

    const validatedItems: any[] = [];
    const unavailableItems: any[] = [];
    let subtotal = 0;
    let totalItemCount = 0;

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product || !product.isAvailable || product.stockQuantity <= 0) {
        unavailableItems.push({
          productId: item.productId,
          name: product?.name || 'Unknown item',
          reason: 'Out of stock or discontinued',
        });
        continue;
      }

      // Cap quantity to available stock or 20
      const safeQty = Math.min(item.quantity, product.stockQuantity, 20);
      const itemPrice = product.discountedPrice;
      const itemTotal = itemPrice * safeQty;

      subtotal += itemTotal;
      totalItemCount += safeQty;

      validatedItems.push({
        productId: product._id,
        name: product.name,
        unit: product.unit,
        price: itemPrice,
        originalPrice: product.originalPrice,
        image: product.images?.[0] || '',
        quantity: safeQty,
        itemTotal,
      });
    }

    // Check delivery location if provided
    let isDeliverable = true;
    let deliveryMessage = 'Delivery available';
    let distanceKm = 0;
    let etaMinutes = 30;

    if (coordinates) {
      const check = isWithinDeliveryRadius(
        coordinates.latitude,
        coordinates.longitude,
        config.storeLocation.latitude,
        config.storeLocation.longitude,
        config.deliveryRadiusKm
      );
      isDeliverable = check.isDeliverable;
      distanceKm = check.distanceKm;

      if (!isDeliverable) {
        deliveryMessage = `Delivery unavailable at this location. Maximum delivery range is ${config.deliveryRadiusKm} km from our hub.`;
      } else {
        const eta = calculateDeliveryEta(
          distanceKm,
          config.estimatedSpeedKmh,
          config.preparationTimeMinutes
        );
        etaMinutes = eta.estimatedMinutes;
      }
    }

    // Delivery fee calculation
    let deliveryFee = 0;
    if (subtotal > 0) {
      if (subtotal >= config.freeDeliveryThreshold) {
        deliveryFee = 0;
      } else {
        deliveryFee = config.baseDeliveryFee;
      }
    }

    const totalAmount = subtotal + deliveryFee;
    const minOrderMet = subtotal >= config.minOrderAmount;

    res.status(200).json({
      success: true,
      items: validatedItems,
      unavailableItems,
      itemCount: totalItemCount,
      subtotal,
      deliveryFee,
      freeDeliveryThreshold: config.freeDeliveryThreshold,
      amountNeededForFreeDelivery: Math.max(0, config.freeDeliveryThreshold - subtotal),
      minOrderAmount: config.minOrderAmount,
      minOrderMet,
      totalAmount,
      isDeliverable,
      deliveryMessage,
      distanceKm,
      estimatedMinutes: etaMinutes,
    });
  } catch (error) {
    next(error);
  }
}
