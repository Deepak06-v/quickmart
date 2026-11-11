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
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/api/client';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/theme';

export default function AuthScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Timer countdown for OTP resend
  useEffect(() => {
    let interval: any;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Request Auth OTP
  const handleRequestOtp = async () => {
    const cleanMobile = mobile.replace(/[\s\-\+]/g, '');
    if (cleanMobile.length !== 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        isNewUser: boolean;
        devOtp?: string;
      }>('/auth/request-otp', {
        mobile: cleanMobile,
        name: name.trim() || undefined,
      });

      if (res.success) {
        setIsNewUser(res.isNewUser);
        setDevOtp(res.devOtp || null);
        setStep('otp');
        setTimer(60);
        setCanResend(false);
      }
    } catch (err: any) {
      Alert.alert('Request Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Verify Auth OTP
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit code sent to your phone.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        token: string;
        user: any;
      }>('/auth/verify-otp', {
        mobile: mobile.replace(/[\s\-\+]/g, ''),
        otp,
        name: name.trim() || undefined,
      });

      if (res.success && res.token && res.user) {
        await login(res.token, res.user);
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDevOtpAutoFill = () => {
    if (devOtp) {
      setOtp(devOtp);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.logoBadge}>
              <Ionicons name="cart" size={32} color={Colors.primary} />
            </View>

            <Text style={styles.title}>
              {step === 'phone' ? 'Quick Login or Sign Up' : 'Verify Mobile Number'}
            </Text>

            <Text style={styles.subtitle}>
              {step === 'phone'
                ? 'Enter your mobile number to proceed with your grocery order.'
                : `We sent a 6-digit verification code to +91 ${mobile}`}
            </Text>

            {/* Dev Mode Helper Notice */}
            {devOtp && step === 'otp' && (
              <TouchableOpacity
                onPress={handleDevOtpAutoFill}
                style={styles.devBanner}
                activeOpacity={0.8}
              >
                <Ionicons name="code-slash" size={16} color={Colors.primaryDark} />
                <Text style={styles.devBannerText}>
                  Dev Mode OTP: <Text style={styles.devOtpHighlight}>{devOtp}</Text> (Tap to auto-fill)
                </Text>
              </TouchableOpacity>
            )}

            {step === 'phone' ? (
              <View style={styles.formContainer}>
                {/* Optional Name field */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Your Name (Optional for existing users)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Ramesh Patel"
                    placeholderTextColor={Colors.textMuted}
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                {/* Mobile Phone Input */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Mobile Number</Text>
                  <View style={styles.phoneInputRow}>
                    <View style={styles.countryCodeBox}>
                      <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                    </View>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="98765 43210"
                      placeholderTextColor={Colors.textMuted}
                      value={mobile}
                      onChangeText={setMobile}
                      keyboardType="phone-pad"
                      maxLength={10}
                      autoFocus
                    />
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleRequestOtp}
                  disabled={loading}
                  style={[
                    styles.primaryButton,
                    mobile.length < 10 && styles.buttonDisabled,
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Continue with OTP</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.termsNotice}>
                  By continuing, you agree to QuickMart's Terms of Service and Privacy Policy.
                </Text>
              </View>
            ) : (
              <View style={styles.formContainer}>
                {/* 6-Digit OTP Input */}
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="000000"
                    placeholderTextColor={Colors.textMuted}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  style={[
                    styles.primaryButton,
                    otp.length !== 6 && styles.buttonDisabled,
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify & Sign In</Text>
                  )}
                </TouchableOpacity>

                {/* Resend and Edit Number options */}
                <View style={styles.resendRow}>
                  {canResend ? (
                    <TouchableOpacity onPress={handleRequestOtp}>
                      <Text style={styles.resendText}>Resend OTP</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.timerText}>Resend code in {timer}s</Text>
                  )}

                  <TouchableOpacity onPress={() => setStep('phone')}>
                    <Text style={styles.editNumberText}>Change Number</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  keyboardContainer: {
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
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
  devBanner: {
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
  devBannerText: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.primaryDark,
    fontWeight: Typography.weights.medium,
  },
  devOtpHighlight: {
    fontWeight: Typography.weights.heavy,
    textDecorationLine: 'underline',
  },
  formContainer: {
    gap: Spacing.lg,
  },
  inputWrapper: {
    gap: Spacing.xs,
  },
  inputLabel: {
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
  },
  textInput: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 50,
    fontSize: Typography.sizes.base,
    color: Colors.text,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  countryCodeBox: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 50,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  otpInput: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    height: 56,
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    letterSpacing: 12,
    color: Colors.text,
  },
  primaryButton: {
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
  primaryButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  termsNotice: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
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
  editNumberText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
  },
});
