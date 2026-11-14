import { Response, NextFunction } from 'express';
import { AuthenticatedAdminRequest } from '../middleware/adminAuthMiddleware';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { AppError } from '../middleware/errorHandler';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function getAdminCategories(
  _req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const categories = await Category.find().sort({ displayOrder: 1, name: 1 });

    // Count products per category
    const productCounts = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    productCounts.forEach((item) => {
      if (item._id) {
        countMap.set(item._id.toString(), item.count);
      }
    });

    const enrichedCategories = categories.map((cat) => ({
      ...cat.toObject(),
      productCount: countMap.get(cat._id.toString()) || 0,
    }));

    res.status(200).json({
      success: true,
      categories: enrichedCategories,
    });
  } catch (error) {
    next(error);
  }
}

export async function createAdminCategory(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, slug, iconName, imageUrl, displayOrder, isActive } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError('Category name is required', 400);
    }

    const finalSlug = (slug && slug.trim()) ? generateSlug(slug) : generateSlug(name);
    const existing = await Category.findOne({ slug: finalSlug });
    if (existing) {
      throw new AppError(`A category with slug "${finalSlug}" already exists.`, 400);
    }

    const maxOrderCat = await Category.findOne().sort({ displayOrder: -1 });
    const nextOrder = displayOrder !== undefined ? Number(displayOrder) : ((maxOrderCat?.displayOrder || 0) + 1);

    const category = await Category.create({
      name: name.trim(),
      slug: finalSlug,
      iconName: (iconName || 'basket-outline').trim(),
      imageUrl: (imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=80').trim(),
      displayOrder: isNaN(nextOrder) ? 1 : nextOrder,
      isActive: isActive !== false,
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category: {
        ...category.toObject(),
        productCount: 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminCategory(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { name, slug, iconName, imageUrl, displayOrder, isActive } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    if (name !== undefined) category.name = name.trim();
    if (iconName !== undefined) category.iconName = iconName.trim();
    if (imageUrl !== undefined) category.imageUrl = imageUrl.trim();
    if (displayOrder !== undefined) category.displayOrder = Number(displayOrder);
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    if (slug !== undefined && slug.trim()) {
      const newSlug = generateSlug(slug);
      if (newSlug !== category.slug) {
        const existing = await Category.findOne({ slug: newSlug, _id: { $ne: id } });
        if (existing) {
          throw new AppError(`Category slug "${newSlug}" is already taken`, 400);
        }
        category.slug = newSlug;
      }
    }

    await category.save();

    const productCount = await Product.countDocuments({ category: category._id });

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      category: {
        ...category.toObject(),
        productCount,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminCategory(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    // Safety check: verify no products are attached to this category
    const associatedProductsCount = await Product.countDocuments({ category: id });
    if (associatedProductsCount > 0) {
      throw new AppError(
        `Cannot delete category "${category.name}" because ${associatedProductsCount} product(s) are currently associated with it. Please reassign or delete these products first.`,
        400
      );
    }

    await Category.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Category "${category.name}" deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
}
