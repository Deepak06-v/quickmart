import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../src/store/cartStore';
import { QuantityController } from '../../src/components/QuantityController';
import { ProductCard } from '../../src/components/ProductCard';
import { api } from '../../src/api/client';
import { IProduct } from '../../src/types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/theme';

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const [gridContainerWidth, setGridContainerWidth] = useState<number>(0);

  const quantity = useCartStore((state) => state.getItemQuantity(id as string));
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const cartItems = useCartStore((state) => state.items);
  const totalCartItems = cartItems.reduce((count, item) => count + item.quantity, 0);

  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () =>
      api.get<{ success: boolean; product: IProduct; relatedProducts: IProduct[] }>(
        `/products/${id}`
      ),
    enabled: !!id,
  });

  const { data: allCatalogData } = useQuery({
    queryKey: ['allCatalogProducts'],
    queryFn: () => api.get<{ success: boolean; products: IProduct[] }>('/products?limit=50'),
  });

  const product = data?.product;
  const rawRelated = data?.relatedProducts || [];
  const allCatalog = allCatalogData?.products || [];

  // Filter out currently viewed product from related products
  const filteredRelated = rawRelated.filter((p) => p._id !== id);
  const relatedIdSet = new Set(filteredRelated.map((p) => p._id));

  // Remaining catalog products excluding current product and any already in related
  const remainingCatalog = allCatalog.filter(
    (p) => p._id !== id && !relatedIdSet.has(p._id)
  );

  // One continuous list starting with relevant products first, followed immediately by remaining catalog
  const continuousProducts = [...filteredRelated, ...remainingCatalog];

  // Two products per row: infoBlock has paddingHorizontal: Spacing.lg (16px left + 16px right = 32px)
  const fallbackWidth = windowWidth - Spacing.lg * 2;
  const effectiveWidth = gridContainerWidth > 0 ? gridContainerWidth : fallbackWidth;
  const gridCardWidth = Math.floor((effectiveWidth - Spacing.md - 2) / 2);

  if (isLoading || !product) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const hasDiscount = product.discountPercentage > 0;
  const isOutOfStock = !product.isAvailable || product.stockQuantity <= 0;
  const imageUri =
    product.images?.[0] ||
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(tabs)/cart')}
          style={styles.cartButton}
        >
          <Ionicons name="bag-handle-outline" size={22} color={Colors.text} />
          {totalCartItems > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{totalCartItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Image Stage */}
        <View style={styles.imageStage}>
          <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="contain" />

          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>
                {product.discountPercentage}% OFF
              </Text>
            </View>
          )}
        </View>

        {/* Product Info Block */}
        <View style={styles.infoBlock}>
          <Text style={styles.unitText}>{product.unit}</Text>
          <Text style={styles.title}>{product.name}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.discountedPrice}>₹{product.discountedPrice}</Text>
            {hasDiscount && (
              <Text style={styles.originalPrice}>₹{product.originalPrice}</Text>
            )}
            {hasDiscount && (
              <View style={styles.savingsPill}>
                <Text style={styles.savingsText}>
                  Save ₹{product.originalPrice - product.discountedPrice}
                </Text>
              </View>
            )}
          </View>

          {/* Availability Status */}
          <View style={styles.stockStatusRow}>
            <View
              style={[
                styles.stockDot,
                { backgroundColor: isOutOfStock ? Colors.danger : Colors.primary },
              ]}
            />
            <Text style={styles.stockStatusText}>
              {isOutOfStock ? 'Currently Out of Stock' : 'In Stock & Ready for Delivery'}
            </Text>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionHeading}>Product Details</Text>
            <Text style={styles.descriptionText}>
              {product.description ||
                'Carefully selected and packed under hygienic standards for maximum freshness.'}
            </Text>
          </View>

          {/* Highlights & Guarantees */}
          <View style={styles.featuresRow}>
            <View style={styles.featureItem}>
              <Ionicons name="leaf-outline" size={20} color={Colors.primary} />
              <Text style={styles.featureTitle}>Farm Fresh</Text>
              <Text style={styles.featureSub}>Direct quality</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
              <Text style={styles.featureTitle}>Cash on Delivery</Text>
              <Text style={styles.featureSub}>Pay at door</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="timer-outline" size={20} color={Colors.primary} />
              <Text style={styles.featureTitle}>Fast Delivery</Text>
              <Text style={styles.featureSub}>Under 30 mins</Text>
            </View>
          </View>

          {/* Continuous Shopping Grid: Relevant products first, followed immediately by remaining catalog */}
          {continuousProducts.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={styles.sectionHeading}>You Might Also Need</Text>
              <View
                style={styles.continuousGrid}
                onLayout={(e) => {
                  const layoutWidth = e.nativeEvent.layout.width;
                  if (layoutWidth > 0 && Math.abs(layoutWidth - gridContainerWidth) > 1) {
                    setGridContainerWidth(layoutWidth);
                  }
                }}
              >
                {continuousProducts.map((p) => (
                  <ProductCard
                    key={p._id}
                    product={p}
                    layout="grid"
                    cardWidth={gridCardWidth}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceCol}>
          <Text style={styles.bottomPriceLabel}>Total Price</Text>
          <Text style={styles.bottomPriceValue}>
            ₹{product.discountedPrice * (quantity > 0 ? quantity : 1)}
          </Text>
        </View>

        {isOutOfStock ? (
          <View style={styles.outOfStockBar}>
            <Text style={styles.outOfStockBarText}>Out of Stock</Text>
          </View>
        ) : quantity > 0 ? (
          <QuantityController
            size="lg"
            quantity={quantity}
            onIncrease={() => updateQuantity(product._id, quantity + 1)}
            onDecrease={() => updateQuantity(product._id, quantity - 1)}
          />
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => addItem(product)}
            style={styles.addToCartButton}
          >
            <Ionicons name="bag-add" size={20} color={Colors.textInverse} />
            <Text style={styles.addToCartButtonText}>Add to Cart</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  iconButton: {
    padding: Spacing.xs,
  },
  cartButton: {
    padding: Spacing.xs,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: Colors.textInverse,
    fontSize: 10,
    fontWeight: Typography.weights.bold,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingBottom: 110,
  },
  imageStage: {
    width: '100%',
    height: 280,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  heroImage: {
    width: '85%',
    height: '85%',
  },
  discountBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: Colors.badgeDiscount,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  discountBadgeText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  infoBlock: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  unitText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    lineHeight: 28,
    marginBottom: Spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  discountedPrice: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  originalPrice: {
    fontSize: Typography.sizes.base,
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  savingsPill: {
    backgroundColor: Colors.primarySubtle,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  savingsText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryDark,
  },
  stockStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockStatusText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.textSecondary,
  },
  descriptionSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionHeading: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  descriptionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureTitle: {
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: 4,
  },
  featureSub: {
    fontSize: Typography.sizes.xs - 1,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  relatedSection: {
    marginTop: Spacing.sm,
  },
  continuousGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    width: '100%',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.card,
  },
  bottomPriceCol: {
    justifyContent: 'center',
  },
  bottomPriceLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },
  bottomPriceValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    gap: Spacing.sm,
  },
  addToCartButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  outOfStockBar: {
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
  },
  outOfStockBarText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
});
