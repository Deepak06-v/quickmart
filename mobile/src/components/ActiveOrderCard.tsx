import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { IOrder, OrderStatus } from '../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme';

interface ActiveOrderCardProps {
  order: IOrder;
}

const STATUS_STEPS: OrderStatus[] = [
  'Order Placed',
  'Order Accepted',
  'Preparing Your Order',
  'Out for Delivery',
  'Delivered',
];

export const ActiveOrderCard: React.FC<ActiveOrderCardProps> = ({ order }) => {
  const router = useRouter();

  const currentStepIndex = Math.max(0, STATUS_STEPS.indexOf(order.status));
  const progressPercent = Math.min(100, Math.round(((currentStepIndex + 1) / STATUS_STEPS.length) * 100));

  const handleTrack = () => {
    router.push({
      pathname: '/orders/[id]',
      params: { id: order._id },
    });
  };

  const formattedEta = order.estimatedDeliveryTime
    ? new Date(order.estimatedDeliveryTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : `${order.estimatedDeliveryMinutes || 25} mins`;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.statusPill}>
          <View style={styles.pulsingDot} />
          <Text style={styles.statusText}>{order.status}</Text>
        </View>

        <Text style={styles.etaText}>Arriving by {formattedEta}</Text>
      </View>

      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>

      <View style={styles.infoRow}>
        <View style={styles.detailsCol}>
          <Text style={styles.orderNumberText}>Order #{order.orderNumber}</Text>
          <Text style={styles.itemsSummaryText} numberOfLines={1}>
            {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleTrack}
          style={styles.trackButton}
        >
          <Text style={styles.trackButtonText}>Track Order</Text>
          <Ionicons name="arrow-forward" size={14} color={Colors.textInverse} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  statusText: {
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryDark,
  },
  etaText: {
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: Spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  detailsCol: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  orderNumberText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  itemsSummaryText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 4,
  },
  trackButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.bold,
  },
});
