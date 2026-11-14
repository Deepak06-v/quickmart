import { Response, NextFunction } from 'express';
import { AuthenticatedAdminRequest } from '../middleware/adminAuthMiddleware';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { AppError } from '../middleware/errorHandler';

export async function getAdminCustomers(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
    const skip = (page - 1) * limit;

    const { search } = req.query;

    const query: any = { isDeleted: false };

    if (search && typeof search === 'string' && search.trim()) {
      const trimmed = search.trim();
      const regex = new RegExp(trimmed, 'i');
      query.$or = [{ name: regex }, { mobile: regex }];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('name mobile createdAt addresses'),
      User.countDocuments(query),
    ]);

    // Aggregate order counts and spent for these users
    const userIds = users.map((u) => u._id);
    const orderAggregates = await Order.aggregate([
      { $match: { user: { $in: userIds } } },
      {
        $group: {
          _id: '$user',
          totalOrders: { $sum: 1 },
          totalSpent: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Delivered'] }, '$totalAmount', 0],
            },
          },
          lastOrderDate: { $max: '$createdAt' },
        },
      },
    ]);

    const orderStatsMap = new Map<string, { totalOrders: number; totalSpent: number; lastOrderDate: Date }>();
    orderAggregates.forEach((item) => {
      if (item._id) {
        orderStatsMap.set(item._id.toString(), {
          totalOrders: item.totalOrders || 0,
          totalSpent: item.totalSpent || 0,
          lastOrderDate: item.lastOrderDate,
        });
      }
    });

    const enrichedCustomers = users.map((u) => {
      const stats = orderStatsMap.get(u._id.toString()) || {
        totalOrders: 0,
        totalSpent: 0,
        lastOrderDate: null,
      };

      return {
        _id: u._id,
        name: u.name,
        mobile: u.mobile,
        createdAt: u.createdAt,
        addressCount: u.addresses?.length || 0,
        defaultAddress: u.addresses?.find((a) => a.isDefault) || u.addresses?.[0] || null,
        totalOrders: stats.totalOrders,
        totalSpent: stats.totalSpent,
        lastOrderDate: stats.lastOrderDate,
      };
    });

    res.status(200).json({
      success: true,
      customers: enrichedCustomers,
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

export async function getAdminCustomerById(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const user = await User.findOne({ _id: id, isDeleted: false }).select(
      'name mobile addresses createdAt updatedAt'
    );

    if (!user) {
      throw new AppError('Customer not found', 404);
    }

    // Fetch customer's full order history
    const orders = await Order.find({ user: user._id })
      .sort({ createdAt: -1 })
      .select('orderNumber items totalAmount paymentMethod paymentStatus status createdAt deliveryAddress');

    const totalOrders = orders.length;
    const deliveredOrders = orders.filter((o) => o.status === 'Delivered');
    const totalSpent = deliveredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    res.status(200).json({
      success: true,
      customer: {
        _id: user._id,
        name: user.name,
        mobile: user.mobile,
        addresses: user.addresses || [],
        createdAt: user.createdAt,
        totalOrders,
        totalSpent,
      },
      orders,
    });
  } catch (error) {
    next(error);
  }
}
