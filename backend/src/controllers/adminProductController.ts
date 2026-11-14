import { Response, NextFunction } from 'express';
import { AuthenticatedAdminRequest } from '../middleware/adminAuthMiddleware';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { Category } from '../models/Category';
import { AppError } from '../middleware/errorHandler';

export async function getAdminProducts(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
    const skip = (page - 1) * limit;

    const { category, search, availability } = req.query;

    const query: any = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (availability === 'available') {
      query.isAvailable = true;
    } else if (availability === 'unavailable') {
      query.isAvailable = false;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { description: searchRegex }, { tags: searchRegex }];
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
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

export async function getAdminProductById(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).populate('category', 'name slug iconName');
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
}

export async function createAdminProduct(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      name,
      description,
      category,
      images,
      originalPrice,
      discountedPrice,
      unit,
      isAvailable,
      isFeatured,
      isOffer,
      tags,
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError('Product name is required', 400);
    }

    if (!category) {
      throw new AppError('Category is required', 400);
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      throw new AppError('Specified category does not exist', 404);
    }

    const origPrice = Number(originalPrice);
    if (isNaN(origPrice) || origPrice < 0) {
      throw new AppError('Original price must be a valid non-negative number', 400);
    }

    const discPrice = discountedPrice !== undefined && discountedPrice !== '' ? Number(discountedPrice) : origPrice;
    if (isNaN(discPrice) || discPrice < 0) {
      throw new AppError('Discounted price must be a valid non-negative number', 400);
    }

    if (!unit || typeof unit !== 'string' || !unit.trim()) {
      throw new AppError('Unit is required (e.g. "1 kg", "500 g", "1 pack")', 400);
    }

    const discountPercentage =
      origPrice > 0 && discPrice < origPrice
        ? Math.round(((origPrice - discPrice) / origPrice) * 100)
        : 0;

    const product = await Product.create({
      name: name.trim(),
      description: (description || '').trim(),
      category,
      images: Array.isArray(images) && images.length > 0 ? images : ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80'],
      originalPrice: origPrice,
      discountedPrice: discPrice,
      discountPercentage,
      unit: unit.trim(),
      stockQuantity: 100, // Safe default
      isAvailable: isAvailable !== false,
      isFeatured: Boolean(isFeatured),
      isOffer: Boolean(isOffer || discountPercentage > 0),
      tags: Array.isArray(tags) ? tags : [],
    });

    const populated = await Product.findById(product._id).populate('category', 'name slug iconName');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: populated,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminProduct(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      images,
      originalPrice,
      discountedPrice,
      unit,
      isAvailable,
      isFeatured,
      isOffer,
      tags,
    } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        throw new AppError('Specified category does not exist', 404);
      }
      product.category = category;
    }

    if (name !== undefined) product.name = name.trim();
    if (description !== undefined) product.description = description.trim();
    if (images !== undefined) product.images = Array.isArray(images) ? images : [images];
    if (unit !== undefined) product.unit = unit.trim();
    if (isAvailable !== undefined) product.isAvailable = Boolean(isAvailable);
    if (isFeatured !== undefined) product.isFeatured = Boolean(isFeatured);
    if (isOffer !== undefined) product.isOffer = Boolean(isOffer);
    if (tags !== undefined) product.tags = Array.isArray(tags) ? tags : [];

    if (originalPrice !== undefined) {
      const orig = Number(originalPrice);
      if (isNaN(orig) || orig < 0) throw new AppError('Original price must be non-negative', 400);
      product.originalPrice = orig;
    }

    if (discountedPrice !== undefined) {
      const disc = Number(discountedPrice);
      if (isNaN(disc) || disc < 0) throw new AppError('Discounted price must be non-negative', 400);
      product.discountedPrice = disc;
    }

    if (product.originalPrice > 0 && product.discountedPrice < product.originalPrice) {
      product.discountPercentage = Math.round(
        ((product.originalPrice - product.discountedPrice) / product.originalPrice) * 100
      );
    } else {
      product.discountPercentage = 0;
    }

    await product.save();

    const populated = await Product.findById(product._id).populate('category', 'name slug iconName');

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: populated,
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleProductAvailability(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    product.isAvailable = isAvailable !== undefined ? Boolean(isAvailable) : !product.isAvailable;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product is now marked as ${product.isAvailable ? 'Available' : 'Unavailable'}`,
      isAvailable: product.isAvailable,
      product,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminProduct(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Check if referenced by historical orders
    const orderCount = await Order.countDocuments({ 'items.product': id });

    if (orderCount > 0) {
      // Safe archival: Mark unavailable so historical orders remain intact
      product.isAvailable = false;
      await product.save();

      res.status(200).json({
        success: true,
        archived: true,
        message: `Product is referenced in ${orderCount} historical order(s). It has been safely archived (marked Unavailable) to protect order history.`,
      });
      return;
    }

    // If completely unreferenced, safe to hard delete
    await Product.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      archived: false,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadProductImage(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError('No image file uploaded', 400);
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({
      success: true,
      imageUrl,
    });
  } catch (error) {
    next(error);
  }
}
