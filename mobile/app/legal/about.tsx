import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/theme';

export default function AboutScreen() {
  const router = useRouter();

  const handleCallSupport = () => {
    Linking.openURL('tel:+919876543210');
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@quickmart.in');
  };

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
        <Text style={styles.headerTitle}>About QuickMart</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.heroBox}>
          <View style={styles.logoCircle}>
            <Ionicons name="cart" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.heroTitle}>QuickMart Hyperlocal</Text>
          <Text style={styles.heroTagline}>
            Fresh groceries delivered to your village and town doorstep in under 30 minutes.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Our Mission</Text>
        <Text style={styles.paragraph}>
          QuickMart brings modern quick-commerce to rural and semi-urban communities where mainstream delivery platforms are unavailable. We partner with local farmers, grain mills, and regional distribution hubs to guarantee genuine freshness, wholesale pricing, and reliable Cash on Delivery service.
        </Text>

        <Text style={styles.sectionTitle}>Customer Support</Text>
        <View style={styles.supportCard}>
          <TouchableOpacity onPress={handleCallSupport} style={styles.supportRow}>
            <Ionicons name="call" size={20} color={Colors.primaryDark} />
            <View style={styles.supportTextCol}>
              <Text style={styles.supportLabel}>Helpline Number</Text>
              <Text style={styles.supportValue}>+91 98765 43210</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity onPress={handleEmailSupport} style={styles.supportRow}>
            <Ionicons name="mail" size={20} color={Colors.primaryDark} />
            <View style={styles.supportTextCol}>
              <Text style={styles.supportLabel}>Customer Support Email</Text>
              <Text style={styles.supportValue}>support@quickmart.in</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.metaBox}>
          <Text style={styles.metaText}>Application Version 1.0.0</Text>
          <Text style={styles.metaSub}>Designed for Native Android Devices</Text>
        </View>
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
  heroBox: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
    ...Shadows.subtle,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 6,
  },
  heroTagline: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  supportCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
    ...Shadows.subtle,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    gap: Spacing.md,
  },
  supportTextCol: {
    flex: 1,
  },
  supportLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
  },
  supportValue: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryDark,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 4,
  },
  metaBox: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  metaText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.textMuted,
  },
  metaSub: {
    fontSize: Typography.sizes.xs - 1,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
