import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../src/theme';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Effective Date: November 2026</Text>

        <Text style={styles.heading}>1. Service Eligibility</Text>
        <Text style={styles.paragraph}>
          QuickMart provides grocery delivery services in designated rural and semi-urban operating zones. Delivery availability is governed dynamically by store proximity and operational conditions.
        </Text>

        <Text style={styles.heading}>2. Cash on Delivery (COD) Policy</Text>
        <Text style={styles.paragraph}>
          Payment must be made in cash upon physical receipt of your grocery order. Each COD order requires phone-number OTP authorization to prevent fraudulent or duplicate submissions.
        </Text>

        <Text style={styles.heading}>3. Product Pricing and Inventory</Text>
        <Text style={styles.paragraph}>
          All product weights, prices, and discounts displayed are confirmed directly from the fulfillment hub database at the time of checkout verification. In the event an item becomes unavailable, you will be notified immediately.
        </Text>

        <Text style={styles.heading}>4. Order Cancellations</Text>
        <Text style={styles.paragraph}>
          Customers may cancel an order directly in the application before the store accepts and begins packing the order. Once the order is out for delivery, cancellation requires contacting customer care.
        </Text>
      </ScrollView>
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.huge,
  },
  lastUpdated: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  heading: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
