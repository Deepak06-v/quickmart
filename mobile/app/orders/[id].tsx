import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { IllustrativeMap } from '../../src/components/IllustrativeMap';
import { StatusBadge } from '../../src/components/StatusBadge';
import { api } from '../../src/api/client';
import { IOrder, OrderStatus } from '../../src/types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/theme';

const TIMELINE_STEPS: OrderStatus[] = [
  'Order Placed',
  'Order Accepted',
  'Preparing Your Order',
  'Out for Delivery',
  'Delivered',
];

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isCancelling, setIsCancelling] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get<{ success: boolean; order: IOrder }>(`/orders/${id}`),
    enabled: !!id,
    refetchInterval: 8000, // Poll every 8s while tracking
  });

  const order = data?.order;

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? Items will be restocked.',
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              const res = await api.post<{ success: boolean; message: string }>(
                `/orders/${id}/cancel`,
                { reason: 'Customer requested cancellation' }
              );
              if (res.success) {
                Alert.alert('Order Cancelled', 'Your order has been cancelled successfully.');
                refetch();
                queryClient.invalidateQueries({ queryKey: ['activeOrder'] });
              }
            } catch (err: any) {
              Alert.alert('Cannot Cancel', err.message);
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleSupportCall = () => {
    Linking.openURL('tel:+919876543210');
  };

  if (isLoading || !order) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const currentStepIdx = TIMELINE_STEPS.indexOf(order.status);
  const isCancelled = order.status === 'Cancelled';
  const isDelivered = order.status === 'Delivered';
  const canCancel = order.status === 'Order Placed';

  const formattedEta = order.estimatedDeliveryTime
    ? new Date(order.estimatedDeliveryTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : `${order.estimatedDeliveryMinutes || 25} mins`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.orderNumber}</Text>
        <TouchableOpacity onPress={handleSupportCall} style={styles.helpButton}>
          <Ionicons name="call-outline" size={18} color={Colors.primaryDark} />
          <Text style={styles.helpText}>Help</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Illustrative Route Map (Visible when order is in progress) */}
        {!isCancelled && (
          <IllustrativeMap
            status={order.status}
            distanceKm={order.distanceKm}
            estimatedMinutes={order.estimatedDeliveryMinutes}
            destinationAddress={`${order.deliveryAddress.houseNumber}, ${order.deliveryAddress.villageTown}`}
          />
        )}

        {/* ETA & Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusTopRow}>
            <View>
              <Text style={styles.statusHeading}>
                {isDelivered
                  ? 'Delivered to your doorstep'
                  : isCancelled
                  ? 'Order Cancelled'
                  : `Estimated Delivery by ${formattedEta}`}
              </Text>
              <Text style={styles.statusSubtitle}>
                {isDelivered
                  ? 'Cash collected. Thank you for shopping with QuickMart!'
                  : isCancelled
                  ? order.cancellationReason || 'Order was cancelled'
                  : 'Our rural hub delivery team is fulfilling your groceries'}
              </Text>
            </View>
            <StatusBadge status={order.status} />
          </View>

          {/* Timeline Steps (if not cancelled) */}
          {!isCancelled && (
            <View style={styles.timelineContainer}>
              {TIMELINE_STEPS.map((step, idx) => {
                const isCompleted = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                const isLast = idx === TIMELINE_STEPS.length - 1;

                return (
                  <View key={step} style={styles.timelineStepRow}>
                    <View style={styles.timelineIndicatorCol}>
                      <View
                        style={[
                          styles.timelineCircle,
                          isCompleted && styles.timelineCircleCompleted,
                          isCurrent && styles.timelineCircleCurrent,
                        ]}
                      >
                        {isCompleted && !isCurrent ? (
                          <Ionicons name="checkmark" size={12} color={Colors.textInverse} />
                        ) : (
                          <View
                            style={[
                              styles.timelineInnerDot,
                              isCurrent && styles.timelineInnerDotActive,
                            ]}
                          />
                        )}
                      </View>
                      {!isLast && (
                        <View
                          style={[
                            styles.timelineBar,
                            idx < currentStepIdx && styles.timelineBarCompleted,
                          ]}
                        />
                      )}
                    </View>

                    <View style={styles.timelineLabelCol}>
                      <Text
                        style={[
                          styles.timelineStepTitle,
                          isCompleted && styles.timelineStepTitleCompleted,
                          isCurrent && styles.timelineStepTitleCurrent,
                        ]}
                      >
                        {step}
                      </Text>
                      {isCurrent && (
                        <Text style={styles.timelineStepDesc}>
                          {step === 'Order Placed' && 'We received your order and are dispatching to store staff.'}
                          {step === 'Order Accepted' && 'Store manager has accepted and started batch packing.'}
                          {step === 'Preparing Your Order' && 'Items are weighed, sanitized, and sealed.'}
                          {step === 'Out for Delivery' && 'Rider is on the way to your delivery address.'}
                          {step === 'Delivered' && 'Order safely handed over.'}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Delivery Address Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          <View style={styles.addressBox}>
            <Ionicons name="location" size={20} color={Colors.primary} />
            <View style={styles.addressTextCol}>
              <Text style={styles.recipientName}>
                {order.deliveryAddress.customerName} (+91 {order.deliveryAddress.customerMobile})
              </Text>
              <Text style={styles.fullAddress}>
                {order.deliveryAddress.houseNumber}, {order.deliveryAddress.streetArea},{' '}
                {order.deliveryAddress.villageTown}
                {order.deliveryAddress.landmark ? ` (Landmark: ${order.deliveryAddress.landmark})` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Ordered Products Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Items Ordered ({order.items.length})</Text>

          {order.items.map((item, idx) => (
            <View key={idx} style={styles.productRow}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productUnit}>
                  {item.unit} × {item.quantity}
                </Text>
              </View>
              <Text style={styles.productPrice}>₹{item.total}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Subtotal</Text>
            <Text style={styles.billVal}>₹{order.subtotal}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            <Text style={styles.billVal}>
              {order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Cash Amount Due on Delivery</Text>
            <Text style={styles.totalVal}>₹{order.totalAmount}</Text>
          </View>
        </View>

        {/* Cancel Order Option if still placed */}
        {canCancel && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCancelOrder}
            disabled={isCancelling}
            style={styles.cancelButton}
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color={Colors.danger} />
            ) : (
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
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
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySubtle,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  helpText: {
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryDark,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.huge,
    gap: Spacing.md,
  },
  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  statusTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  statusHeading: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  statusSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    maxWidth: 220,
  },
  timelineContainer: {
    marginTop: Spacing.sm,
  },
  timelineStepRow: {
    flexDirection: 'row',
  },
  timelineIndicatorCol: {
    alignItems: 'center',
    width: 28,
  },
  timelineCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineCircleCompleted: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timelineCircleCurrent: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primaryDark,
    borderWidth: 2.5,
  },
  timelineInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textMuted,
  },
  timelineInnerDotActive: {
    backgroundColor: Colors.primaryDark,
  },
  timelineBar: {
    width: 2,
    height: 36,
    backgroundColor: Colors.border,
    marginVertical: -2,
    zIndex: 1,
  },
  timelineBarCompleted: {
    backgroundColor: Colors.primary,
  },
  timelineLabelCol: {
    flex: 1,
    paddingLeft: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  timelineStepTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.textMuted,
  },
  timelineStepTitleCompleted: {
    color: Colors.text,
    fontWeight: Typography.weights.semibold,
  },
  timelineStepTitleCurrent: {
    color: Colors.primaryDark,
    fontWeight: Typography.weights.bold,
  },
  timelineStepDesc: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  sectionTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  addressTextCol: {
    flex: 1,
  },
  recipientName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  fullAddress: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  productInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  productName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  productUnit: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  productPrice: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.sm,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  billLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  billVal: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  totalLabel: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  totalVal: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryDark,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerLight,
  },
  cancelButtonText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.danger,
  },
});
