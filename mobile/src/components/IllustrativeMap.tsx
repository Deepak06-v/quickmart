import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme';
import { OrderStatus } from '../types';

interface IllustrativeMapProps {
  status: OrderStatus;
  distanceKm: number;
  estimatedMinutes: number;
  storeName?: string;
  destinationAddress?: string;
}

export const IllustrativeMap: React.FC<IllustrativeMapProps> = ({
  status,
  distanceKm,
  estimatedMinutes,
  storeName = 'QuickMart Fulfillment Hub',
  destinationAddress = 'Your Delivery Address',
}) => {
  // Determine vehicle position percentage on the simulated route
  let riderProgress = 0.15; // Order Placed
  if (status === 'Order Accepted') riderProgress = 0.3;
  if (status === 'Preparing Your Order') riderProgress = 0.45;
  if (status === 'Out for Delivery') riderProgress = 0.75;
  if (status === 'Delivered') riderProgress = 1.0;

  return (
    <View style={styles.card}>
      {/* Illustrative Canvas Container */}
      <View style={styles.canvas}>
        {/* Subtle grid lines background representing rural roadmap */}
        <View style={styles.roadGrid}>
          <View style={[styles.gridLineHorizontal, { top: 30 }]} />
          <View style={[styles.gridLineHorizontal, { top: 90 }]} />
          <View style={[styles.gridLineVertical, { left: '25%' }]} />
          <View style={[styles.gridLineVertical, { left: '70%' }]} />
        </View>

        {/* The Route Path */}
        <View style={styles.routeTrack}>
          <View
            style={[
              styles.routeProgressFill,
              { width: `${riderProgress * 100}%` },
            ]}
          />
        </View>

        {/* Store Node */}
        <View style={styles.storeNode}>
          <View style={styles.storeIconWrapper}>
            <Ionicons name="business" size={16} color={Colors.textInverse} />
          </View>
          <Text style={styles.nodeLabel} numberOfLines={1}>
            {storeName.split(' ')[0]} Hub
          </Text>
        </View>

        {/* Destination Node */}
        <View style={styles.destNode}>
          <View style={styles.destIconWrapper}>
            <Ionicons name="home" size={16} color={Colors.textInverse} />
          </View>
          <Text style={styles.nodeLabel} numberOfLines={1}>
            Delivery Address
          </Text>
        </View>

        {/* Simulated Courier Pin on Path */}
        <View
          style={[
            styles.riderNode,
            { left: `${Math.min(88, Math.max(12, riderProgress * 100))}%` },
          ]}
        >
          <View style={styles.riderBubble}>
            <Ionicons name="bicycle" size={18} color={Colors.primaryDark} />
          </View>
        </View>

        {/* Floating Metrics Badge */}
        <View style={styles.metricsBadge}>
          <View style={styles.metricItem}>
            <Ionicons name="navigate-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.metricText}>Approx. {distanceKm || 2.5} km</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.metricText}>~{estimatedMinutes || 25} mins</Text>
          </View>
        </View>
      </View>

      {/* Mandatory Illustrative Notice & Disclaimer */}
      <View style={styles.disclaimerContainer}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.disclaimerText}>
          Illustrative route visualization. ETA is estimated based on store distance and road conditions. Not a live GPS tracking view.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  canvas: {
    height: 160,
    backgroundColor: '#F0FDF4', // Very soft greenish-tint map background
    position: 'relative',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  roadGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.25,
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#94A3B8',
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#94A3B8',
  },
  routeTrack: {
    height: 6,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    position: 'relative',
    marginHorizontal: 20,
  },
  routeProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  storeNode: {
    position: 'absolute',
    left: 12,
    top: 45,
    alignItems: 'center',
    width: 70,
  },
  storeIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...Shadows.subtle,
  },
  destNode: {
    position: 'absolute',
    right: 12,
    top: 45,
    alignItems: 'center',
    width: 80,
  },
  destIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...Shadows.subtle,
  },
  nodeLabel: {
    fontSize: Typography.sizes.xs - 1,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  riderNode: {
    position: 'absolute',
    top: 55,
    transform: [{ translateX: -18 }],
  },
  riderBubble: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  metricsBadge: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  metricDivider: {
    width: 1,
    height: 10,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    gap: 6,
  },
  disclaimerText: {
    flex: 1,
    fontSize: Typography.sizes.xs - 1,
    color: Colors.textSecondary,
    lineHeight: 14,
  },
});
