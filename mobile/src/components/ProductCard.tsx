import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { IProduct } from '../types';
import { useCartStore } from '../store/cartStore';
import { QuantityController } from './QuantityController';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme';

interface ProductCardProps {
  product: IProduct;
  layout?: 'grid' | 'horizontal';
}

const { width } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (width - Spacing.lg * 2 - Spacing.md) / 2;

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  layout = 'grid',
}) => {
  const router = useRouter();
  const quantity = useCartStore((state) => state.getItemQuantity(product._id));
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  const isGrid = layout === 'grid';
  const hasDiscount = product.discountPercentage > 0;
  const isOutOfStock = !product.isAvailable || product.stockQuantity <= 0;

  const handlePress = () => {
    router.push({
      pathname: '/product/[id]',
      params: { id: product._id },
    });
  };

  const handleAdd = () => {
    if (!isOutOfStock) {
      addItem(product);
    }
  };

  const imageUri =
    product.images?.[0] ||
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80';

  if (!isGrid) {
    // Horizontal card for "Recommended" or carousel
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        style={styles.horizontalCard}
      >
        <View style={styles.horizontalImageContainer}>
          <Image source={{ uri: imageUri }} style={styles.horizontalImage} resizeMode="cover" />
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{product.discountPercentage}% OFF</Text>
            </View>
          )}
        </View>

        <View style={styles.horizontalContent}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.unitText}>{product.unit}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.discountedPrice}>₹{product.discountedPrice}</Text>
            {hasDiscount && (
              <Text style={styles.originalPrice}>₹{product.originalPrice}</Text>
            )}
          </View>

          <View style={styles.actionContainer}>
            {isOutOfStock ? (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>Out of Stock</Text>
              </View>
            ) : quantity > 0 ? (
              <QuantityController
                size="sm"
                quantity={quantity}
                onIncrease={() => updateQuantity(product._id, quantity + 1)}
                onDecrease={() => updateQuantity(product._id, quantity - 1)}
              />
            ) : (
              <TouchableOpacity
                onPress={handleAdd}
                style={styles.addButtonSm}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color={Colors.primary} />
                <Text style={styles.addButtonTextSm}>ADD</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Standard 2-column Grid Card
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      style={styles.gridCard}
    >
      <View style={styles.gridImageContainer}>
        <Image source={{ uri: imageUri }} style={styles.gridImage} resizeMode="cover" />

        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{product.discountPercentage}% OFF</Text>
          </View>
        )}

        {isOutOfStock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockOverlayText}>Out of stock</Text>
          </View>
        )}
      </View>

      <View style={styles.gridContent}>
        <Text style={styles.unitText}>{product.unit}</Text>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>

        <View style={styles.bottomRow}>
          <View style={styles.priceColumn}>
            <Text style={styles.discountedPrice}>₹{product.discountedPrice}</Text>
            {hasDiscount && (
              <Text style={styles.originalPrice}>₹{product.originalPrice}</Text>
            )}
          </View>

          <View>
            {isOutOfStock ? (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>Sold</Text>
              </View>
            ) : quantity > 0 ? (
              <QuantityController
                size="sm"
                quantity={quantity}
                onIncrease={() => updateQuantity(product._id, quantity + 1)}
                onDecrease={() => updateQuantity(product._id, quantity - 1)}
              />
            ) : (
              <TouchableOpacity
                onPress={handleAdd}
                style={styles.addButton}
                activeOpacity={0.8}
              >
                <Text style={styles.addButtonText}>ADD</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gridCard: {
    width: GRID_ITEM_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  gridImageContainer: {
    width: '100%',
    height: 130,
    backgroundColor: Colors.surfaceSubtle,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridContent: {
    padding: Spacing.sm + 2,
    flex: 1,
    justifyContent: 'space-between',
  },
  horizontalCard: {
    width: 160,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  horizontalImageContainer: {
    width: '100%',
    height: 110,
    backgroundColor: Colors.surfaceSubtle,
    position: 'relative',
  },
  horizontalImage: {
    width: '100%',
    height: '100%',
  },
  horizontalContent: {
    padding: Spacing.sm,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.badgeDiscount,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  discountText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockOverlayText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  unitText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  productName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    lineHeight: 18,
    minHeight: 36,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  priceColumn: {
    justifyContent: 'center',
  },
  discountedPrice: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  originalPrice: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  addButton: {
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: Colors.primaryDark,
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.bold,
  },
  addButtonSm: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addButtonTextSm: {
    color: Colors.primaryDark,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    marginLeft: 2,
  },
  actionContainer: {
    marginTop: Spacing.sm,
    alignItems: 'flex-start',
  },
  outOfStockBadge: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  outOfStockText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weights.medium,
  },
});
