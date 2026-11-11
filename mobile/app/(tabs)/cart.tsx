import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../src/store/cartStore';
import { useAuthStore } from '../../src/store/authStore';
import { useLocationStore } from '../../src/store/locationStore';
import { QuantityController } from '../../src/components/QuantityController';
import { ActiveOrderCard } from '../../src/components/ActiveOrderCard';
import { EmptyState } from '../../src/components/EmptyState';
import { api } from '../../src/api/client';
import { IOrder } from '../../src/types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/theme';

export default function CartScreen() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.discountedPrice * item.quantity,
    0
  );
  const totalItems = items.reduce((count, item) => count + item.quantity, 0);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isDeliverable = useLocationStore((state) => state.isDeliverable);
  const deliveryConfig = useLocationStore((state) => state.deliveryConfig);

  // Poll active order if logged in
  const { data: activeOrderData } = useQuery({
    queryKey: ['activeOrder'],
    queryFn: () => api.get<{ success: boolean; activeOrder: IOrder | null }>('/orders/active'),
    enabled: isAuthenticated,
    refetchInterval: 10000, // Poll every 10 seconds for real-time progress update
  });

  const activeOrder = activeOrderData?.activeOrder;

  // Delivery fee rules
  const baseDeliveryFee = deliveryConfig?.baseDeliveryFee ?? 25;
  const freeThreshold = deliveryConfig?.freeDeliveryThreshold ?? 299;
  const minOrderAmount = deliveryConfig?.minOrderAmount ?? 99;

  const isFreeDelivery = subtotal >= freeThreshold;
  const deliveryFee = subtotal === 0 ? 0 : isFreeDelivery ? 0 : baseDeliveryFee;
  const totalAmount = subtotal + deliveryFee;
  const amountNeededForFree = Math.max(0, freeThreshold - subtotal);
  const meetsMinOrder = subtotal >= minOrderAmount;

  const handleCheckout = () => {
    if (!meetsMinOrder) {
      Alert.alert(
        'Minimum Order Required',
        `Please add items worth ₹${minOrderAmount - subtotal} more to meet the minimum order value of ₹${minOrderAmount}.`
      );
      return;
    }

    if (!isDeliverable) {
      Alert.alert(
        'Delivery Unavailable',
        'Your selected location is outside our delivery zone. Please choose a serviceable address before checking out.'
      );
      return;
    }

    if (!isAuthenticated) {
      router.push('/auth');
    } else {
      router.push('/checkout');
    }
  };

  const handleClearCart = () => {
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm('Are you sure you want to remove all items from your cart?')
      ) {
        clearCart();
      }
    } else {
      Alert.alert('Clear Cart', 'Are you sure you want to remove all items from your cart?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => clearCart() },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={handleClearCart}>
            <Text style={styles.clearCartText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Order Card if present */}
        {activeOrder && <ActiveOrderCard order={activeOrder} />}

        {items.length === 0 ? (
          <EmptyState
            iconName="bag-handle-outline"
            title="Your Cart is Empty"
            description="Explore our fresh farm produce, dairy, and grocery essentials to start filling your basket."
            actionLabel="Start Shopping"
            onAction={() => router.push('/(tabs)')}
          />
        ) : (
          <>
            {/* Free Delivery Goal Bar */}
            <View style={styles.freeDeliveryCard}>
              <View style={styles.freeDeliveryRow}>
                <Ionicons
                  name={isFreeDelivery ? 'checkmark-circle' : 'bicycle'}
                  size={20}
                  color={isFreeDelivery ? Colors.primaryDark : Colors.accent}
                />
                <Text style={styles.freeDeliveryText}>
                  {isFreeDelivery
                    ? '🎉 You unlocked FREE Delivery!'
                    : `Add ₹${amountNeededForFree} more for FREE Delivery`}
                </Text>
              </View>
              <View style={styles.freeDeliveryTrack}>
                <View
                  style={[
                    styles.freeDeliveryProgress,
                    {
                      width: `${Math.min(100, Math.round((subtotal / freeThreshold) * 100))}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Cart Items List */}
            <View style={styles.itemsCard}>
              <Text style={styles.itemsCountTitle}>Items ({totalItems})</Text>

              {items.map(({ product, quantity }) => (
                <View key={product._id} style={styles.itemRow}>
                  <Image
                    source={{
                      uri:
                        product.images?.[0] ||
                        'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&q=80',
                    }}
                    style={styles.itemImage}
                    resizeMode="cover"
                  />

                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={styles.itemUnit}>{product.unit}</Text>
                    <Text style={styles.itemPrice}>₹{product.discountedPrice}</Text>
                  </View>

                  <View style={styles.itemActions}>
                    <QuantityController
                      size="sm"
                      quantity={quantity}
                      onIncrease={() => updateQuantity(product._id, quantity + 1)}
                      onDecrease={() => updateQuantity(product._id, quantity - 1)}
                    />
                    <Text style={styles.itemTotal}>
                      ₹{product.discountedPrice * quantity}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Bill Details */}
            <View style={styles.billCard}>
              <Text style={styles.billTitle}>Bill Details</Text>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Item Total ({totalItems} items)</Text>
                <Text style={styles.billValue}>₹{subtotal}</Text>
              </View>

              <View style={styles.billRow}>
                <View style={styles.deliveryFeeLabelRow}>
                  <Text style={styles.billLabel}>Delivery Fee</Text>
                  {isFreeDelivery && (
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeBadgeText}>FREE</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.billValue,
                    isFreeDelivery && styles.billValueStrikethrough,
                  ]}
                >
                  {isFreeDelivery ? `₹${baseDeliveryFee}` : `₹${deliveryFee}`}
                </Text>
              </View>

              <View style={styles.billDivider} />

              <View style={styles.totalRow}>
                <View>
                  <Text style={styles.totalLabel}>To Pay</Text>
                  <Text style={styles.paymentMethodNotice}>Cash on Delivery (COD)</Text>
                </View>
                <Text style={styles.totalAmount}>₹{totalAmount}</Text>
              </View>
            </View>

            {/* Hyperlocal COD Guarantee Notice */}
            <View style={styles.codNoticeCard}>
              <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primaryDark} />
              <Text style={styles.codNoticeText}>
                Safe & Simple: Pay cash right at your doorstep after inspecting your groceries. Verified with SMS confirmation.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating Checkout Button Bar */}
      {items.length > 0 && (
        <View style={styles.footerBar}>
          <View style={styles.footerPriceCol}>
            <Text style={styles.footerTotalLabel}>Payable Total</Text>
            <Text style={styles.footerTotalAmount}>₹{totalAmount}</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCheckout}
            style={[
              styles.checkoutButton,
              (!meetsMinOrder || !isDeliverable) && styles.checkoutButtonDisabled,
            ]}
          >
            <Text style={styles.checkoutButtonText}>
              {!isAuthenticated ? 'Proceed to Sign In' : 'Proceed to Checkout'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  clearCartText: {
    fontSize: Typography.sizes.sm,
    color: Colors.danger,
    fontWeight: Typography.weights.semibold,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: 110,
  },
  freeDeliveryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  freeDeliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  freeDeliveryText: {
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  freeDeliveryTrack: {
    height: 5,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },
  freeDeliveryProgress: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  itemsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  itemsCountTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSubtle,
    marginRight: Spacing.md,
  },
  itemDetails: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  itemName: {
    fontSize: Typography.sizes.base - 1,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    lineHeight: 18,
  },
  itemUnit: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: 2,
  },
  itemActions: {
    alignItems: 'flex-end',
    gap: 4,
  },
  itemTotal: {
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  billCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  billTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  deliveryFeeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  freeBadge: {
    backgroundColor: Colors.primarySubtle,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.xs,
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryDark,
  },
  billLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  billValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  billValueStrikethrough: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  billDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  totalLabel: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  paymentMethodNotice: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  totalAmount: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryDark,
  },
  codNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySubtle,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  codNoticeText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    color: Colors.primaryDark,
    lineHeight: 16,
  },
  footerBar: {
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
  footerPriceCol: {
    justifyContent: 'center',
  },
  footerTotalLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  footerTotalAmount: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    gap: Spacing.sm,
  },
  checkoutButtonDisabled: {
    backgroundColor: Colors.textMuted,
  },
  checkoutButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
});
