import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { useCartStore } from '../src/store/cartStore';
import { useLocationStore } from '../src/store/locationStore';
import { api } from '../src/api/client';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/theme';

export default function CheckoutScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const cartItems = useCartStore((state) => state.items);
  const coordinates = useLocationStore((state) => state.coordinates);

  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerMobile, setCustomerMobile] = useState(user?.mobile || '');
  const [houseNumber, setHouseNumber] = useState('');
  const [streetArea, setStreetArea] = useState('');
  const [villageTown, setVillageTown] = useState('');
  const [landmark, setLandmark] = useState('');
  const [saveAddress, setSaveAddress] = useState(true);

  // Address selection from saved addresses if available
  const savedAddresses = user?.addresses || [];
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(
    savedAddresses.find((a) => a.isDefault)?._id || null
  );

  // Server revalidation state
  const [isValidating, setIsValidating] = useState(true);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill from default address if available
  useEffect(() => {
    if (savedAddresses.length > 0) {
      const defaultAddr = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
      setHouseNumber(defaultAddr.houseNumber);
      setStreetArea(defaultAddr.streetArea);
      setVillageTown(defaultAddr.villageTown);
      setLandmark(defaultAddr.landmark || '');
      setSelectedSavedId(defaultAddr._id || null);
    }
  }, []);

  // Revalidate cart with backend on checkout entry
  useEffect(() => {
    const runValidation = async () => {
      setIsValidating(true);
      try {
        const payload = {
          items: cartItems.map((item) => ({
            productId: item.product._id,
            quantity: item.quantity,
          })),
          coordinates: coordinates || undefined,
        };

        const res = await api.post<any>('/cart/validate', payload);
        setValidationResult(res);
      } catch (err: any) {
        Alert.alert('Validation Error', err.message);
      } finally {
        setIsValidating(false);
      }
    };

    if (cartItems.length > 0) {
      runValidation();
    }
  }, [cartItems, coordinates]);

  const handleSelectSaved = (addr: any) => {
    setSelectedSavedId(addr._id);
    setHouseNumber(addr.houseNumber);
    setStreetArea(addr.streetArea);
    setVillageTown(addr.villageTown);
    setLandmark(addr.landmark || '');
  };

  const handleProceedToOrderOtp = async () => {
    if (!houseNumber.trim() || !streetArea.trim() || !villageTown.trim()) {
      Alert.alert('Address Incomplete', 'Please provide house number, street area, and village or town name.');
      return;
    }

    if (validationResult && !validationResult.isDeliverable) {
      Alert.alert('Delivery Unavailable', validationResult.deliveryMessage);
      return;
    }

    setIsSubmitting(true);
    const addressPayload = {
      houseNumber: houseNumber.trim(),
      streetArea: streetArea.trim(),
      villageTown: villageTown.trim(),
      landmark: landmark.trim() || undefined,
      coordinates: coordinates || undefined,
      customerName: customerName.trim() || user?.name || 'Customer',
      customerMobile: customerMobile.trim() || user?.mobile,
    };

    try {
      // If saving address
      if (saveAddress && selectedSavedId === null) {
        await api.post('/profile/addresses', addressPayload).catch(() => {});
      }

      // Step 1: Request 2nd separate OTP for COD order confirmation
      const res = await api.post<{
        success: boolean;
        message: string;
        devOtp?: string;
      }>('/orders/request-otp', {
        items: cartItems.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
        })),
        address: addressPayload,
      });

      if (res.success) {
        // Navigate to Order OTP confirmation screen with order payload in params
        router.push({
          pathname: '/order-otp',
          params: {
            addressData: JSON.stringify(addressPayload),
            itemsData: JSON.stringify(
              cartItems.map((item) => ({
                productId: item.product._id,
                quantity: item.quantity,
              }))
            ),
            devOtp: res.devOtp || '',
          },
        });
      }
    } catch (err: any) {
      Alert.alert('Unable to proceed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.validatingText}>Revalidating fresh prices & stock with store...</Text>
      </SafeAreaView>
    );
  }

  const subtotal = validationResult?.subtotal ?? 0;
  const deliveryFee = validationResult?.deliveryFee ?? 25;
  const totalAmount = validationResult?.totalAmount ?? subtotal + deliveryFee;

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
        <Text style={styles.headerTitle}>Checkout & Address</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Saved Addresses quick selection */}
        {savedAddresses.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Saved Addresses</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.savedScroll}>
              {savedAddresses.map((addr) => {
                const isSelected = selectedSavedId === addr._id;
                return (
                  <TouchableOpacity
                    key={addr._id}
                    onPress={() => handleSelectSaved(addr)}
                    style={[styles.savedChip, isSelected && styles.savedChipSelected]}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={16}
                      color={isSelected ? Colors.primaryDark : Colors.textMuted}
                    />
                    <Text style={[styles.savedChipText, isSelected && styles.savedChipTextSelected]}>
                      {addr.houseNumber}, {addr.villageTown}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Delivery Address Form */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Delivery Destination</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Recipient Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={customerName}
              onChangeText={setCustomerName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>House Number / Flat / Building Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 14-B, Patel Vas"
              value={houseNumber}
              onChangeText={setHouseNumber}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street / Faliya / Area *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Station Road, Near Panchayat"
              value={streetArea}
              onChangeText={setStreetArea}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Village / Town *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mogar / Anand"
              value={villageTown}
              onChangeText={setVillageTown}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nearby Landmark (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Opposite Water Tank, Hanuman Temple"
              value={landmark}
              onChangeText={setLandmark}
            />
          </View>

          <TouchableOpacity
            onPress={() => setSaveAddress(!saveAddress)}
            style={styles.checkboxRow}
            activeOpacity={0.8}
          >
            <Ionicons
              name={saveAddress ? 'checkbox' : 'square-outline'}
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.checkboxLabel}>Save this address for future orders</Text>
          </TouchableOpacity>
        </View>

        {/* Payment Method - Restricted to Cash on Delivery (COD) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          <View style={styles.codSelectionRow}>
            <View style={styles.codIconCircle}>
              <Ionicons name="cash" size={24} color={Colors.primaryDark} />
            </View>
            <View style={styles.codTextCol}>
              <View style={styles.codHeaderRow}>
                <Text style={styles.codTitle}>Cash on Delivery (COD)</Text>
                <View style={styles.onlyBadge}>
                  <Text style={styles.onlyBadgeText}>ONLY METHOD</Text>
                </View>
              </View>
              <Text style={styles.codSubtitle}>
                Pay cash to the delivery partner upon receiving and inspecting your items.
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
          </View>
        </View>

        {/* Verified Order Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order Summary</Text>

          {validationResult?.items?.map((item: any) => (
            <View key={item.productId} style={styles.summaryItemRow}>
              <Text style={styles.summaryItemText}>
                {item.quantity}x {item.name} ({item.unit})
              </Text>
              <Text style={styles.summaryItemPrice}>₹{item.itemTotal}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.summaryBillRow}>
            <Text style={styles.summaryBillLabel}>Subtotal</Text>
            <Text style={styles.summaryBillVal}>₹{subtotal}</Text>
          </View>

          <View style={styles.summaryBillRow}>
            <Text style={styles.summaryBillLabel}>Delivery Fee</Text>
            <Text style={styles.summaryBillVal}>
              {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
            </Text>
          </View>

          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>Final Amount Due</Text>
            <Text style={styles.summaryTotalVal}>₹{totalAmount}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Order Trigger */}
      <View style={styles.footerBar}>
        <View>
          <Text style={styles.footerTotalLabel}>Cash Due on Delivery</Text>
          <Text style={styles.footerTotalAmount}>₹{totalAmount}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleProceedToOrderOtp}
          disabled={isSubmitting}
          style={styles.confirmButton}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={Colors.textInverse} />
          ) : (
            <>
              <Text style={styles.confirmButtonText}>Confirm COD Order</Text>
              <Ionicons name="shield-checkmark" size={18} color={Colors.textInverse} />
            </>
          )}
        </TouchableOpacity>
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
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  validatingText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
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
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: 110,
    gap: Spacing.md,
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
  savedScroll: {
    flexDirection: 'row',
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    marginRight: Spacing.sm,
    gap: 6,
  },
  savedChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySubtle,
  },
  savedChipText: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  savedChipTextSelected: {
    color: Colors.primaryDark,
    fontWeight: Typography.weights.bold,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 48,
    fontSize: Typography.sizes.base,
    color: Colors.text,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  checkboxLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  codSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  codIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codTextCol: {
    flex: 1,
  },
  codHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  codTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryDark,
  },
  onlyBadge: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.xs,
  },
  onlyBadgeText: {
    color: Colors.textInverse,
    fontSize: 9,
    fontWeight: Typography.weights.heavy,
  },
  codSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  summaryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  summaryItemText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  summaryItemPrice: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.sm,
  },
  summaryBillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryBillLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  summaryBillVal: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  summaryTotalLabel: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  summaryTotalVal: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryDark,
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
  footerTotalLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },
  footerTotalAmount: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    gap: Spacing.sm,
  },
  confirmButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
});
