import mongoose, { Schema, Document } from 'mongoose';

export interface IDeliveryConfig extends Document {
  storeLocation: {
    latitude: number;
    longitude: number;
    name: string;
    address: string;
  };
  deliveryRadiusKm: number;
  baseDeliveryFee: number;
  freeDeliveryThreshold: number;
  minOrderAmount: number;
  estimatedSpeedKmh: number;
  preparationTimeMinutes: number;
  isAcceptingOrders: boolean;
  appVersion: string;
  supportPhone: string;
  supportEmail: string;
  updatedAt: Date;
}

const DeliveryConfigSchema = new Schema<IDeliveryConfig>(
  {
    storeLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      name: { type: String, required: true },
      address: { type: String, required: true },
    },
    deliveryRadiusKm: { type: Number, default: 15 },
    baseDeliveryFee: { type: Number, default: 25 },
    freeDeliveryThreshold: { type: Number, default: 299 },
    minOrderAmount: { type: Number, default: 99 },
    estimatedSpeedKmh: { type: Number, default: 25 },
    preparationTimeMinutes: { type: Number, default: 15 },
    isAcceptingOrders: { type: Boolean, default: true },
    appVersion: { type: String, default: '1.0.0' },
    supportPhone: { type: String, default: '+91 98765 43210' },
    supportEmail: { type: String, default: 'support@quickmart.in' },
  },
  {
    timestamps: true,
  }
);

export const DeliveryConfig = mongoose.model<IDeliveryConfig>('DeliveryConfig', DeliveryConfigSchema);
