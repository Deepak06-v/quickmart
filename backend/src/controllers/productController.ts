import { Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product';
import { AppError } from '../middleware/errorHandler';

export async function getAllProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const skip = (page - 1) * limit;
    const categoryId = req.query.category as string;
    const sortBy = req.query.sort as string;

    const query: any = { isAvailable: true };
    if (categoryId) {
      query.category = categoryId;
    }

    let sortOption: any = { createdAt: -1 };
    if (sortBy === 'price_asc') {
      sortOption = { discountedPrice: 1 };
    } else if (sortBy === 'price_desc') {
      sortOption = { discountedPrice: -1 };
    } else if (sortBy === 'discount') {
      sortOption = { discountPercentage: -1 };
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug iconName'),
      Product.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
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

export async function searchProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = ((req.query.q as string) || '').trim();
    if (!q) {
      res.status(200).json({
        success: true,
        products: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const skip = (page - 1) * limit;

    // Use regex search for friendly fuzzy matching on name, description, tags
    const searchRegex = new RegExp(q, 'i');
    const query = {
      isAvailable: true,
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
      ],
    };

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ isFeatured: -1, isOffer: -1 })
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug'),
      Product.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      query: q,
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

export async function getProductDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).populate('category', 'name slug');

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Also fetch 4 related products from the same category
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isAvailable: true,
    })
      .limit(6)
      .populate('category', 'name slug');

    res.status(200).json({
      success: true,
      product,
      relatedProducts,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOffers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = 15;
    const products = await Product.find({
      isAvailable: true,
      $or: [{ isOffer: true }, { discountPercentage: { $gt: 0 } }],
    })
      .sort({ discountPercentage: -1, isFeatured: -1 })
      .limit(limit)
      .populate('category', 'name slug');

    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRecommendedProducts(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = 12;
    const products = await Product.find({
      isAvailable: true,
      isFeatured: true,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('category', 'name slug');

    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    next(error);
  }
}
