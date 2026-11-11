import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/theme';

export default function OrderSuccessScreen() {
  const router = useRouter();
  const { orderId, orderNumber } = useLocalSearchParams<{
    orderId: string;
    orderNumber: string;
  }>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Success Check Circle */}
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={54} color={Colors.textInverse} />
          </View>

          <Text style={styles.title}>Order Confirmed!</Text>
          <Text style={styles.subtitle}>
            Your Cash on Delivery order has been successfully placed and received by our rural fulfillment hub.
          </Text>

          {orderNumber && (
            <View style={styles.orderNumberBox}>
              <Text style={styles.orderNumberLabel}>ORDER ID</Text>
              <Text style={styles.orderNumberValue}>{orderNumber}</Text>
            </View>
          )}

          {/* Guarantee Pill */}
          <View style={styles.infoCard}>
            <Ionicons name="cash-outline" size={20} color={Colors.primaryDark} />
            <Text style={styles.infoCardText}>
              Please keep exact cash ready upon arrival. You can inspect all fresh items before paying.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.bottomButtons}>
          {orderId && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                router.replace({
                  pathname: '/orders/[id]',
                  params: { id: orderId },
                })
              }
              style={styles.trackButton}
            >
              <Ionicons name="navigate-outline" size={18} color={Colors.textInverse} />
              <Text style={styles.trackButtonText}>Track Order Progress</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.replace('/(tabs)')}
            style={styles.shoppingButton}
          >
            <Text style={styles.shoppingButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  container: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'space-between',
  },
  content: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  successCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  title: {
    fontSize: Typography.sizes.display - 4,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: Spacing.xl,
  },
  orderNumberBox: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  orderNumberLabel: {
    fontSize: Typography.sizes.xs - 1,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  orderNumberValue: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryDark,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySubtle,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  infoCardText: {
    flex: 1,
    fontSize: Typography.sizes.xs + 1,
    color: Colors.primaryDark,
    lineHeight: 18,
  },
  bottomButtons: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    height: 52,
    gap: Spacing.sm,
    ...Shadows.subtle,
  },
  trackButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  shoppingButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  shoppingButtonText: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
});
