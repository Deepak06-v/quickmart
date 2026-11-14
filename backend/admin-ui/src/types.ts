export interface IAdmin {
  id: string;
  name: string;
  email: string;
  role: 'admin';
  lastLogin?: string;
}

export interface IExpense {
  _id: string;
  description: string;
  amount: number;
  date: string;
  createdAt: string;
}

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  iconName: string;
  imageUrl: string;
  displayOrder: number;
  isActive: boolean;
  productCount?: number;
}

export interface IProduct {
  _id: string;
  name: string;
  description: string;
  category: {
    _id: string;
    name: string;
    slug?: string;
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
  createdAt: string;
}

export interface IOrderItem {
  product: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  image: string;
  total: number;
}

export interface IOrderStatusHistory {
  status: string;
  timestamp: string;
  note?: string;
}

export interface IOrder {
  _id: string;
  orderNumber: string;
  user: {
    _id: string;
    name: string;
    mobile: string;
  } | string;
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
  status: 'Order Placed' | 'Order Accepted' | 'Preparing Your Order' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  statusHistory: IOrderStatusHistory[];
  distanceKm: number;
  estimatedDeliveryMinutes: number;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ICustomer {
  _id: string;
  name: string;
  mobile: string;
  createdAt: string;
  addressCount: number;
  defaultAddress?: any;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
}

export interface IDashboardMetrics {
  totalOrders: number;
  pendingOrders: number;
  dispatchedOrders: number;
  deliveredOrders: number;
  totalDeliveredSales: number;
  totalExpenses: number;
}

export interface IDashboardSummary {
  period: {
    year: number;
    month: number;
  };
  metrics: IDashboardMetrics;
  recentOrders: IOrder[];
  expenses: IExpense[];
}
