import { Request, Response, NextFunction } from 'express';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { AppError } from '../middleware/errorHandler';

export async function getAllCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1 });
    res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCategoryProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { slug } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const skip = (page - 1) * limit;

    const category = await Category.findOne({ slug, isActive: true });
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    const [products, total] = await Promise.all([
      Product.find({ category: category._id, isAvailable: true })
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug'),
      Product.countDocuments({ category: category._id, isAvailable: true }),
    ]);

    res.status(200).json({
      success: true,
      category,
      products,
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
