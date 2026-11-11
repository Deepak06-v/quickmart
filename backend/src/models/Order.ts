import mongoose, { Schema, Document } from 'mongoose';

export type OrderStatus =
  | 'Order Placed'
  | 'Order Accepted'
  | 'Preparing Your Order'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  image: string;
  total: number;
}

export interface IOrderStatusHistory {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  user: mongoose.Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: 'COD';
  paymentStatus: 'PENDING_ON_DELIVERY' | 'PAID';
  deliveryAddress: {
    houseNumber: string;
    streetArea: string;
    villageTown: string;
    landmark?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    customerName: string;
    customerMobile: string;
  };
  status: OrderStatus;
  statusHistory: IOrderStatusHistory[];
  distanceKm: number;
  estimatedDeliveryMinutes: number;
  estimatedDeliveryTime: Date;
  idempotencyKey?: string;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, required: true },
    image: { type: String, default: '' },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const OrderStatusHistorySchema = new Schema<IOrderStatusHistory>(
  {
    status: {
      type: String,
      required: true,
      enum: [
        'Order Placed',
        'Order Accepted',
        'Preparing Your Order',
        'Out for Delivery',
        'Delivered',
        'Cancelled',
      ],
    },
    timestamp: { type: Date, default: Date.now },
    note: { type: String },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, default: 'COD', enum: ['COD'] },
    paymentStatus: {
      type: String,
      default: 'PENDING_ON_DELIVERY',
      enum: ['PENDING_ON_DELIVERY', 'PAID'],
    },
    deliveryAddress: {
      houseNumber: { type: String, required: true },
      streetArea: { type: String, required: true },
      villageTown: { type: String, required: true },
      landmark: { type: String },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
      customerName: { type: String, required: true },
      customerMobile: { type: String, required: true },
    },
    status: {
      type: String,
      default: 'Order Placed',
      enum: [
        'Order Placed',
        'Order Accepted',
        'Preparing Your Order',
        'Out for Delivery',
        'Delivered',
        'Cancelled',
      ],
      index: true,
    },
    statusHistory: { type: [OrderStatusHistorySchema], default: [] },
    distanceKm: { type: Number, default: 0 },
    estimatedDeliveryMinutes: { type: Number, default: 30 },
    estimatedDeliveryTime: { type: Date, required: true },
    idempotencyKey: { type: String, sparse: true, index: true },
    cancellationReason: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
