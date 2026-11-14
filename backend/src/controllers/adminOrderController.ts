import { Response, NextFunction } from 'express';
import { AuthenticatedAdminRequest } from '../middleware/adminAuthMiddleware';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { AppError } from '../middleware/errorHandler';

export async function getAdminOrders(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
    const skip = (page - 1) * limit;

    const { status, search } = req.query;

    const query: any = {};

    if (status && status !== 'all') {
      if (status === 'pending') {
        query.status = { $in: ['Order Placed', 'Order Accepted', 'Preparing Your Order'] };
      } else if (status === 'dispatched') {
        query.status = 'Out for Delivery';
      } else if (status === 'delivered') {
        query.status = 'Delivered';
      } else if (status === 'cancelled') {
        query.status = 'Cancelled';
      } else {
        query.status = status;
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      const trimmed = search.trim();
      const regex = new RegExp(trimmed, 'i');
      query.$or = [
        { orderNumber: regex },
        { 'deliveryAddress.customerMobile': regex },
        { 'deliveryAddress.customerName': regex },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name mobile'),
      Order.countDocuments(query),
    ]);

    // Also get quick status count pills
    const [pendingCount, dispatchedCount, deliveredCount, cancelledCount, allCount] = await Promise.all([
      Order.countDocuments({ status: { $in: ['Order Placed', 'Order Accepted', 'Preparing Your Order'] } }),
      Order.countDocuments({ status: 'Out for Delivery' }),
      Order.countDocuments({ status: 'Delivered' }),
      Order.countDocuments({ status: 'Cancelled' }),
      Order.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      orders,
      counts: {
        all: allCount,
        pending: pendingCount,
        dispatched: dispatchedCount,
        delivered: deliveredCount,
        cancelled: cancelledCount,
      },
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

export async function getAdminOrderById(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      $or: [{ _id: id }, { orderNumber: id }],
    }).populate('user', 'name mobile createdAt');

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

export async function markOrderDispatched(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.status === 'Cancelled') {
      throw new AppError('Cannot dispatch a cancelled order', 400);
    }

    if (order.status === 'Delivered') {
      throw new AppError('Order has already been marked as delivered', 400);
    }

    order.status = 'Out for Delivery';
    order.statusHistory.push({
      status: 'Out for Delivery',
      timestamp: new Date(),
      note: 'Order confirmed and dispatched for delivery by admin.',
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: `Order #${order.orderNumber} marked as Out for Delivery`,
      order,
    });
  } catch (error) {
    next(error);
  }
}

export async function markOrderDelivered(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { cashCollected } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.status === 'Cancelled') {
      throw new AppError('Cannot deliver a cancelled order', 400);
    }

    const isPaid = cashCollected === true;

    order.status = 'Delivered';
    order.paymentStatus = isPaid ? 'PAID' : 'PENDING_ON_DELIVERY';
    order.statusHistory.push({
      status: 'Delivered',
      timestamp: new Date(),
      note: isPaid
        ? 'Order delivered successfully to customer. COD payment collected (PAID).'
        : 'Order delivered to customer. COD payment pending (Cash NOT collected).',
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: isPaid
        ? `Order #${order.orderNumber} marked as Delivered (Cash collected: PAID)`
        : `Order #${order.orderNumber} marked as Delivered (Payment pending: Cash NOT collected)`,
      order,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelOrderByAdmin(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.status === 'Delivered') {
      throw new AppError('Cannot cancel an order that has already been delivered.', 400);
    }

    if (order.status === 'Cancelled') {
      throw new AppError('Order is already cancelled.', 400);
    }

    order.status = 'Cancelled';
    order.cancellationReason = reason || 'Cancelled by store admin';
    order.statusHistory.push({
      status: 'Cancelled',
      timestamp: new Date(),
      note: reason || 'Cancelled by store admin',
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: `Order #${order.orderNumber} cancelled successfully.`,
      order,
    });
  } catch (error) {
    next(error);
  }
}
