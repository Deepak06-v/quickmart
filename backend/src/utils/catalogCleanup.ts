import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { Order } from '../models/Order';

/**
 * Identifiable product names originating from legacy mock/demo seed files.
 */
export const MOCK_PRODUCT_NAMES: string[] = [
  'Farm Fresh Onions (Pyaz)',
  'Fresh Farm Potatoes (Aloo)',
  'Country Tomatoes (Desi Tamatar)',
  'Fresh Green Chillies (Hari Mirch)',
  'Fresh Ginger (Adrak)',
  'Robusta Bananas (Kela)',
  'Crisp Royal Gala Apples',
  'Sweet Papaya (Papita)',
  'Fresh Toned Milk Pouch',
  'Fresh Farm Malai Paneer',
  'Farm Fresh White Eggs',
  'Chakki Fresh Sharbati Wheat Atta',
  'Premium Basmati Rice (Wada Kolam)',
  'Natural Refined Sugar (Chini)',
  'Unpolished Toor Dal (Arhar Dal)',
  'Moong Dal Dhuli (Yellow Lentils)',
  'Kachi Ghani Cold-Pressed Mustard Oil',
  'Kachi Ghani Cold-Pressed Mustard Oil (Sarson Ka Tel)',
  'Pure Desi Cow Ghee (Bilona)',
  'Crispy Salted Potato Chips',
  'Parle-G Glucose Biscuits Family Pack',
  'Assam Strong Leaf Tea (Kadak Chai)',
  'Detergent Powder with Active Oxygen',
  'Lemon Dishwash Bar (Tough Grease Cleaner)',
];

/**
 * Identifiable category slugs originating from legacy mock/demo seed files.
 */
export const MOCK_CATEGORY_SLUGS: string[] = [
  'vegetables',
  'fruits',
  'dairy-eggs',
  'atta-rice-grains',
  'dals-pulses',
  'oils-ghee',
  'snacks-biscuits',
  'beverages',
  'household',
];

export interface CleanupResult {
  removedProducts: number;
  archivedProducts: number;
  removedCategories: number;
  retainedCategories: number;
}

/**
 * Safely removes identifiable mock products from the active catalog.
 * - If a mock product is referenced by a historical order, it is marked unavailable (archived)
 *   so order history snapshots and line-items remain fully intact.
 * - If completely unreferenced, it is permanently deleted.
 * - Unused mock categories are removed only if NO products (active or archived) reference them.
 * - Any products and categories created manually by the Admin are strictly preserved.
 */
export async function cleanupMockCatalog(): Promise<CleanupResult> {
  const result: CleanupResult = {
    removedProducts: 0,
    archivedProducts: 0,
    removedCategories: 0,
    retainedCategories: 0,
  };

  try {
    // 1. Identify existing mock products in the database
    const mockProducts = await Product.find({ name: { $in: MOCK_PRODUCT_NAMES } });

    for (const prod of mockProducts) {
      // Check if product is referenced in historical orders
      const orderCount = await Order.countDocuments({ 'items.product': prod._id });

      if (orderCount > 0) {
        // Order exists -> preserve historical record, remove from customer view
        if (prod.isAvailable) {
          prod.isAvailable = false;
          await prod.save();
          result.archivedProducts++;
          console.log(
            `📦 [Catalog Cleanup] Mock product "${prod.name}" is referenced in ${orderCount} order(s); archived (marked unavailable).`
          );
        }
      } else {
        // Unreferenced -> safe to hard delete
        await Product.findByIdAndDelete(prod._id);
        result.removedProducts++;
        console.log(`🗑️  [Catalog Cleanup] Deleted unreferenced mock product: "${prod.name}".`);
      }
    }

    // 2. Identify mock categories
    const mockCategories = await Category.find({ slug: { $in: MOCK_CATEGORY_SLUGS } });

    for (const cat of mockCategories) {
      // Check if any product (genuine admin product or retained archived product) depends on this category
      const attachedCount = await Product.countDocuments({ category: cat._id });

      if (attachedCount === 0) {
        await Category.findByIdAndDelete(cat._id);
        result.removedCategories++;
        console.log(`🗑️  [Catalog Cleanup] Deleted unused mock category: "${cat.name}" (${cat.slug}).`);
      } else {
        result.retainedCategories++;
      }
    }

    if (result.removedProducts > 0 || result.archivedProducts > 0 || result.removedCategories > 0) {
      console.log(
        `✅ [Catalog Cleanup] Summary: Removed ${result.removedProducts} mock products, archived ${result.archivedProducts} referenced mock products, removed ${result.removedCategories} empty mock categories.`
      );
    }

    return result;
  } catch (error) {
    console.error('❌ [Catalog Cleanup] Error during mock catalog cleanup:', error);
    throw error;
  }
}
