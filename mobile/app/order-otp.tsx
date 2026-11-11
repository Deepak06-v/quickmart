import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { useCartStore } from '../src/store/cartStore';
import { api } from '../src/api/client';
import { IOrder } from '../src/types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/theme';

export default function OrderOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    addressData: string;
    itemsData: string;
    devOtp?: string;
  }>();

  const user = useAuthStore((state) => state.user);
  const clearCart = useCartStore((state) => state.clearCart);

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [devOtp, setDevOtp] = useState(params.devOtp || '');

  // Address and items data passed from checkout
  const address = params.addressData ? JSON.parse(params.addressData) : null;
  const items = params.itemsData ? JSON.parse(params.itemsData) : null;

  // Countdown timer for resend
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleResend = async () => {
    setLoading(true);
    try {
      const res = await api.post<{ success: boolean; devOtp?: string }>('/orders/request-otp', {
        items,
        address,
      });
      if (res.success) {
        setTimer(60);
        setCanResend(false);
        if (res.devOtp) {
          setDevOtp(res.devOtp);
        }
      }
    } catch (err: any) {
      Alert.alert('Resend Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit order verification code.');
      return;
    }

    setLoading(true);
    const idempotencyKey = `order_${user?.id}_${Date.now()}`;

    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        order: IOrder;
      }>('/orders/confirm', {
        otp,
        items,
        address,
        idempotencyKey,
      });

      if (res.success && res.order) {
        // Empty cart immediately
        await clearCart();

        // Navigate to Order Success screen
        router.replace({
          pathname: '/order-success',
          params: { orderId: res.order._id, orderNumber: res.order.orderNumber },
        });
      }
    } catch (err: any) {
      Alert.alert('Confirmation Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.shieldIconWrapper}>
            <Ionicons name="shield-checkmark" size={36} color={Colors.primary} />
          </View>

          <Text style={styles.title}>Confirm Your COD Order</Text>
          <Text style={styles.subtitle}>
            For your security and delivery verification, please enter the 6-digit confirmation code sent to +91 {user?.mobile}
          </Text>

          {/* Dev OTP Helper */}
          {devOtp ? (
            <TouchableOpacity
              onPress={() => setOtp(devOtp)}
              style={styles.devOtpBanner}
              activeOpacity={0.8}
            >
              <Ionicons name="code-slash" size={16} color={Colors.primaryDark} />
              <Text style={styles.devOtpText}>
                Dev Order OTP: <Text style={styles.devOtpUnderline}>{devOtp}</Text> (Tap to fill)
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* OTP Input */}
          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={Colors.textMuted}
            autoFocus
          />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleConfirmOrder}
            disabled={loading || otp.length !== 6}
            style={[styles.confirmButton, (loading || otp.length !== 6) && styles.buttonDisabled]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.textInverse} />
            ) : (
              <Text style={styles.confirmButtonText}>Verify & Place COD Order</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendRow}>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendText}>Resend Order Code</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.timerText}>Resend code in {timer}s</Text>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
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
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  closeButton: {
    padding: Spacing.xs,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  shieldIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  devOtpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  devOtpText: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.primaryDark,
    fontWeight: Typography.weights.medium,
  },
  devOtpUnderline: {
    fontWeight: Typography.weights.heavy,
    textDecorationLine: 'underline',
  },
  otpInput: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    height: 58,
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    letterSpacing: 12,
    color: Colors.text,
    marginBottom: Spacing.xl,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.subtle,
  },
  buttonDisabled: {
    backgroundColor: Colors.textMuted,
  },
  confirmButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  resendText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryDark,
  },
  timerText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
  },
});
