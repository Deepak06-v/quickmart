import { Response, NextFunction } from 'express';
import { AuthenticatedAdminRequest } from '../middleware/adminAuthMiddleware';
import { Order } from '../models/Order';
import { Expense } from '../models/Expense';
import { AppError } from '../middleware/errorHandler';

export async function getDashboardSummary(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const now = new Date();
    const year = parseInt(req.query.year as string, 10) || now.getFullYear();
    const month = parseInt(req.query.month as string, 10) || now.getMonth() + 1; // 1-12

    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // 1. Total orders placed in the selected month
    const totalOrdersCount = await Order.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // 2. Pending orders awaiting dispatch placed in the selected month
    const pendingOrdersCount = await Order.countDocuments({
      status: { $in: ['Order Placed', 'Order Accepted', 'Preparing Your Order'] },
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // 3. Dispatched orders in the selected month
    const dispatchedOrdersCount = await Order.countDocuments({
      $or: [
        {
          statusHistory: {
            $elemMatch: {
              status: 'Out for Delivery',
              timestamp: { $gte: startDate, $lte: endDate },
            },
          },
        },
        {
          status: 'Out for Delivery',
          updatedAt: { $gte: startDate, $lte: endDate },
        },
      ],
    });

    // 4. Delivered orders in the selected month
    const deliveredOrders = await Order.find({
      $or: [
        {
          statusHistory: {
            $elemMatch: {
              status: 'Delivered',
              timestamp: { $gte: startDate, $lte: endDate },
            },
          },
        },
        {
          status: 'Delivered',
          updatedAt: { $gte: startDate, $lte: endDate },
        },
      ],
    });

    const deliveredOrdersCount = deliveredOrders.length;

    // 5. Total delivered sales: sum of COD order totals for delivered orders
    const totalDeliveredSales = deliveredOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    // 6. Total recorded expenses in the selected month
    const expenses = await Expense.find({
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: -1 });

    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    // Recent orders in this month (last 6)
    const recentOrders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .select('orderNumber deliveryAddress totalAmount status createdAt paymentMethod items');

    res.status(200).json({
      success: true,
      period: {
        year,
        month,
        startDate,
        endDate,
      },
      metrics: {
        totalOrders: totalOrdersCount,
        pendingOrders: pendingOrdersCount,
        dispatchedOrders: dispatchedOrdersCount,
        deliveredOrders: deliveredOrdersCount,
        totalDeliveredSales,
        totalExpenses,
      },
      recentOrders,
      expenses,
    });
  } catch (error) {
    next(error);
  }
}

export async function getExpenses(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const now = new Date();
    const year = parseInt(req.query.year as string, 10) || now.getFullYear();
    const month = parseInt(req.query.month as string, 10) || now.getMonth() + 1;

    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const expenses = await Expense.find({
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: -1 });

    const total = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    res.status(200).json({
      success: true,
      period: { year, month },
      total,
      expenses,
    });
  } catch (error) {
    next(error);
  }
}

export async function addExpense(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { description, amount, date } = req.body;

    if (!description || typeof description !== 'string' || !description.trim()) {
      throw new AppError('Expense description is required', 400);
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new AppError('Amount must be a positive number', 400);
    }

    const expenseDate = date ? new Date(date) : new Date();
    if (isNaN(expenseDate.getTime())) {
      throw new AppError('Invalid expense date', 400);
    }

    const expense = await Expense.create({
      description: description.trim(),
      amount: numAmount,
      date: expenseDate,
      createdBy: req.admin?._id,
    });

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      expense,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteExpense(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await Expense.findByIdAndDelete(id);

    if (!deleted) {
      throw new AppError('Expense record not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Expense record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
