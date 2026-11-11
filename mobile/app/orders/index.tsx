import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { StatusBadge } from '../../src/components/StatusBadge';
import { EmptyState } from '../../src/components/EmptyState';
import { api } from '../../src/api/client';
import { IOrder } from '../../src/types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/theme';

export default function OrderHistoryScreen() {
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['customerOrders'],
    queryFn: () => api.get<{ success: boolean; orders: IOrder[] }>('/orders'),
  });

  const orders = data?.orders || [];

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
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : orders.length === 0 ? (
        <EmptyState
          iconName="receipt-outline"
          title="No Orders Yet"
          description="You haven't placed any grocery orders yet. Start adding items to your cart!"
          actionLabel="Shop Now"
          onAction={() => router.push('/(tabs)')}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => {
            const formattedDate = new Date(item.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: '/orders/[id]',
                    params: { id: item._id },
                  })
                }
                style={styles.orderCard}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
                    <Text style={styles.orderDate}>{formattedDate}</Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>

                <View style={styles.divider} />

                <Text style={styles.itemsSummary} numberOfLines={2}>
                  {item.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                </Text>

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.paymentMethod}>Payment: Cash on Delivery</Text>
                    <Text style={styles.totalAmount}>₹{item.totalAmount}</Text>
                  </View>

                  <View style={styles.viewDetailsRow}>
                    <Text style={styles.viewDetailsText}>Track & Details</Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.primaryDark} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
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
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  orderCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderNumber: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  orderDate: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.md,
  },
  itemsSummary: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  paymentMethod: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
  },
  totalAmount: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryDark,
    marginTop: 2,
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailsText: {
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryDark,
  },
});
