export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  iconName: string;
  imageUrl: string;
  displayOrder: number;
}

export interface IProduct {
  _id: string;
  name: string;
  description: string;
  category: {
    _id: string;
    name: string;
    slug: string;
    iconName?: string;
  } | string;
  images: string[];
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  unit: string;
  stockQuantity: number;
  isAvailable: boolean;
  isFeatured: boolean;
  isOffer: boolean;
  tags: string[];
}

export interface IAddress {
  _id?: string;
  houseNumber: string;
  streetArea: string;
  villageTown: string;
  landmark?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  isDefault?: boolean;
}

export interface IUser {
  id: string;
  name: string;
  mobile: string;
  profilePhoto?: string;
  addresses: IAddress[];
  createdAt?: string;
}

export type OrderStatus =
  | 'Order Placed'
  | 'Order Accepted'
  | 'Preparing Your Order'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export interface IOrderItem {
  product: string | IProduct;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  image: string;
  total: number;
}

export interface IOrderStatusHistory {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface IOrder {
  _id: string;
  orderNumber: string;
  user: string;
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
  estimatedDeliveryTime: string;
  createdAt: string;
  cancellationReason?: string;
}

export interface IDeliveryConfig {
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
}

export interface ICartItem {
  product: IProduct;
  quantity: number;
}
