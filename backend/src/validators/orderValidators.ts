import { z } from 'zod';

export const orderItemInputSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(20, 'Max 20 units per item allowed'),
});

export const deliveryAddressInputSchema = z.object({
  houseNumber: z.string().trim().min(1, 'House number or building name is required'),
  streetArea: z.string().trim().min(2, 'Street or area is required'),
  villageTown: z.string().trim().min(2, 'Village or town is required'),
  landmark: z.string().trim().optional(),
  coordinates: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  customerName: z.string().trim().min(2, 'Customer name is required').optional(),
  customerMobile: z.string().trim().optional(),
});

export const requestOrderOtpSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, 'Order must contain at least 1 product'),
  address: deliveryAddressInputSchema,
});

export const confirmOrderSchema = z.object({
  otp: z.string().trim().length(6, 'Order confirmation OTP must be 6 digits'),
  items: z.array(orderItemInputSchema).min(1, 'Order must contain at least 1 product'),
  address: deliveryAddressInputSchema,
  idempotencyKey: z.string().optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(3, 'Please provide a cancellation reason').max(200).optional(),
});
