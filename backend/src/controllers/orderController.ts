import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Order, OrderStatus } from '../models/Order';
import { Product } from '../models/Product';
import { Otp } from '../models/Otp';
import { DeliveryConfig } from '../models/DeliveryConfig';
import { env } from '../config/env';
import { getSmsProvider, generateNumericOtp } from '../services/sms/smsService';
import { hashOtp, compareOtp } from '../utils/crypto';
import { calculateDistanceKm, isWithinDeliveryRadius, calculateDeliveryEta } from '../utils/geo';
import { generateOrderNumber } from '../utils/orderNumber';
import { requestOrderOtpSchema, confirmOrderSchema, cancelOrderSchema } from '../validators/orderValidators';
import { AppError } from '../middleware/errorHandler';

/**
 * Step 1: Request 2nd OTP specifically for Order Confirmation (COD).
 */
export async function requestOrderConfirmationOtp(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const { items, address } = requestOrderOtpSchema.parse(req.body);

    const config = (await DeliveryConfig.findOne()) || {
      storeLocation: env.STORE_LOCATION,
      deliveryRadiusKm: env.DELIVERY_RADIUS_KM,
      minOrderAmount: env.MIN_ORDER_AMOUNT,
    };

    // Validate delivery location coordinates if present
    if (address.coordinates) {
      const check = isWithinDeliveryRadius(
        address.coordinates.latitude,
        address.coordinates.longitude,
        config.storeLocation.latitude,
        config.storeLocation.longitude,
        config.deliveryRadiusKm
      );

      if (!check.isDeliverable) {
        throw new AppError(
          `Delivery is currently unavailable at this address (${check.distanceKm} km away). Our delivery radius is ${config.deliveryRadiusKm} km.`,
          400
        );
      }
    }

    // Revalidate items & compute subtotal from database
    const productIds = items.map((i) => i.productId);
    const dbProducts = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(dbProducts.map((p) => [p._id.toString(), p]));

    let subtotal = 0;
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product || !product.isAvailable || product.stockQuantity <= 0) {
        throw new AppError(`Item "${product?.name || 'Item'}" is currently out of stock.`, 400);
      }
      subtotal += product.discountedPrice * item.quantity;
    }

    if (subtotal < config.minOrderAmount) {
      throw new AppError(`Minimum order amount is ₹${config.minOrderAmount}. Current subtotal is ₹${subtotal}.`, 400);
    }

    // Invalidate existing active order OTPs for this mobile
    await Otp.deleteMany({ mobile: user.mobile, purpose: 'ORDER_CONFIRMATION' });

    // Generate 6-digit order confirmation OTP
    const rawOtp = generateNumericOtp();
    const otpHash = await hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

    await Otp.create({
      mobile: user.mobile,
      otpHash,
      purpose: 'ORDER_CONFIRMATION',
      expiresAt,
      attempts: 0,
      maxAttempts: env.OTP_MAX_ATTEMPTS,
      isVerified: false,
    });

    const smsProvider = getSmsProvider();
    const smsResult = await smsProvider.sendOtp(user.mobile, rawOtp, 'ORDER_CONFIRMATION');

    res.status(200).json({
      success: true,
      message: `Order confirmation OTP sent to +91-${user.mobile}`,
      expiresInMinutes: env.OTP_EXPIRY_MINUTES,
      ...(smsResult.devOtp ? { devOtp: smsResult.devOtp } : {}),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Step 2: Verify Order Confirmation OTP and place COD Order.
 */
export async function confirmOrder(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const { otp, items, address, idempotencyKey } = confirmOrderSchema.parse(req.body);

    // Prevent duplicate submission with idempotency key
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({ idempotencyKey, user: user._id });
      if (existingOrder) {
        res.status(200).json({
          success: true,
          message: 'Order was already placed successfully.',
          order: existingOrder,
          isDuplicate: true,
        });
        return;
      }
    }

    // Verify 2nd OTP
    const otpDoc = await Otp.findOne({
      mobile: user.mobile,
      purpose: 'ORDER_CONFIRMATION',
      isVerified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpDoc) {
      throw new AppError('Order confirmation OTP has expired or is invalid. Please request a new OTP.', 400);
    }

    if (otpDoc.attempts >= otpDoc.maxAttempts) {
      await Otp.deleteOne({ _id: otpDoc._id });
      throw new AppError('Too many failed attempts. Please request a fresh OTP.', 400);
    }

    const isMatch = await compareOtp(otp, otpDoc.otpHash);
    if (!isMatch) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      const remaining = otpDoc.maxAttempts - otpDoc.attempts;
      throw new AppError(`Incorrect OTP. ${remaining} attempt(s) remaining.`, 400);
    }

    // Mark OTP verified & remove
    otpDoc.isVerified = true;
    await otpDoc.save();
    await Otp.deleteOne({ _id: otpDoc._id });

    // Fetch config for fee and distance
    const config = (await DeliveryConfig.findOne()) || {
      storeLocation: env.STORE_LOCATION,
      deliveryRadiusKm: env.DELIVERY_RADIUS_KM,
      baseDeliveryFee: env.BASE_DELIVERY_FEE,
      freeDeliveryThreshold: env.FREE_DELIVERY_THRESHOLD,
      minOrderAmount: env.MIN_ORDER_AMOUNT,
      estimatedSpeedKmh: env.ESTIMATED_SPEED_KMH,
      preparationTimeMinutes: env.PREPARATION_TIME_MINUTES,
    };

    // Calculate distance and ETA
    let distanceKm = 2.5; // Default local distance
    if (address.coordinates) {
      const check = isWithinDeliveryRadius(
        address.coordinates.latitude,
        address.coordinates.longitude,
        config.storeLocation.latitude,
        config.storeLocation.longitude,
        config.deliveryRadiusKm
      );
      if (!check.isDeliverable) {
        throw new AppError(`Delivery address is outside service zone (${check.distanceKm} km).`, 400);
      }
      distanceKm = check.distanceKm;
    }

    const eta = calculateDeliveryEta(
      distanceKm,
      config.estimatedSpeedKmh,
      config.preparationTimeMinutes
    );

    // Revalidate items against current database prices and stock
    const productIds = items.map((i) => i.productId);
    const dbProducts = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(dbProducts.map((p) => [p._id.toString(), p]));

    let subtotal = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product || !product.isAvailable || product.stockQuantity < item.quantity) {
        throw new AppError(`Item "${product?.name || 'Item'}" has insufficient stock.`, 400);
      }

      const itemTotal = product.discountedPrice * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.discountedPrice,
        quantity: item.quantity,
        unit: product.unit,
        image: product.images?.[0] || '',
        total: itemTotal,
      });

      // Deduct stock quantity
      product.stockQuantity -= item.quantity;
      if (product.stockQuantity <= 0) {
        product.isAvailable = false;
      }
      await product.save();
    }

    if (subtotal < config.minOrderAmount) {
      throw new AppError(`Minimum order amount is ₹${config.minOrderAmount}.`, 400);
    }

    const deliveryFee = subtotal >= config.freeDeliveryThreshold ? 0 : config.baseDeliveryFee;
    const totalAmount = subtotal + deliveryFee;

    const orderNumber = generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      user: user._id,
      items: orderItems,
      subtotal,
      deliveryFee,
      totalAmount,
      paymentMethod: 'COD',
      paymentStatus: 'PENDING_ON_DELIVERY',
      deliveryAddress: {
        houseNumber: address.houseNumber,
        streetArea: address.streetArea,
        villageTown: address.villageTown,
        landmark: address.landmark,
        coordinates: address.coordinates,
        customerName: address.customerName || user.name,
        customerMobile: address.customerMobile || user.mobile,
      },
      status: 'Order Placed',
      statusHistory: [
        {
          status: 'Order Placed',
          timestamp: new Date(),
          note: 'Order placed successfully with Cash on Delivery verified via OTP.',
        },
      ],
      distanceKm,
      estimatedDeliveryMinutes: eta.estimatedMinutes,
      estimatedDeliveryTime: eta.estimatedTime,
      idempotencyKey,
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! Cash will be collected on delivery.',
      order,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get customer orders list.
 */
export async function getCustomerOrders(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit as string || '15', 10)));
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ user: user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments({ user: user._id }),
    ]);

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get active in-progress order for the customer.
 */
export async function getActiveOrder(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const activeOrder = await Order.findOne({
      user: user._id,
      status: { $in: ['Order Placed', 'Order Accepted', 'Preparing Your Order', 'Out for Delivery'] },
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      activeOrder: activeOrder || null,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get specific order details.
 */
export async function getOrderDetails(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params;

    const order = await Order.findOne({
      $or: [{ _id: id }, { orderNumber: id }],
      user: user._id,
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel order if still in 'Order Placed' status.
 */
export async function cancelOrder(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { reason } = cancelOrderSchema.parse(req.body);

    const order = await Order.findOne({ _id: id, user: user._id });
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.status !== 'Order Placed') {
      throw new AppError(
        `Order cannot be cancelled because it is already "${order.status}". Please contact customer support.`,
        400
      );
    }

    order.status = 'Cancelled';
    order.cancellationReason = reason || 'Cancelled by customer';
    order.statusHistory.push({
      status: 'Cancelled',
      timestamp: new Date(),
      note: reason || 'Cancelled by customer',
    });
    await order.save();

    // Restock items
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stockQuantity: item.quantity },
        $set: { isAvailable: true },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully.',
      order,
    });
  } catch (error) {
    next(error);
  }
}
