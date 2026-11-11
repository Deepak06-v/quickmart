import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../src/theme';

export default function PrivacyPolicyScreen() {
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Effective Date: November 2026</Text>

        <Text style={styles.heading}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          QuickMart ("we", "our", or "us") is committed to protecting your privacy. This policy explains how we collect, store, and process your personal data when using our hyperlocal grocery delivery application.
        </Text>

        <Text style={styles.heading}>2. Information We Collect</Text>
        <Text style={styles.paragraph}>
          • Mobile phone number for SMS OTP verification and delivery communication.{"\n"}
          • Delivery destination addresses, village names, and geographical coordinates to verify serviceability and dispatch orders.{"\n"}
          • Order transaction details, ordered grocery items, and Cash on Delivery records.
        </Text>

        <Text style={styles.heading}>3. Location Data</Text>
        <Text style={styles.paragraph}>
          QuickMart requests location access only while using the application to verify whether your residence is within our configured rural and semi-urban delivery boundary. We never track your GPS coordinates in the background.
        </Text>

        <Text style={styles.heading}>4. Account Deletion & Data Retention</Text>
        <Text style={styles.paragraph}>
          You have the complete right to delete your customer account at any time directly through the application profile screen. Upon OTP verification, your personal profile and saved addresses are permanently removed or anonymized in accordance with applicable tax and statutory retention mandates.
        </Text>

        <Text style={styles.heading}>5. Contact Our Privacy Officer</Text>
        <Text style={styles.paragraph}>
          For inquiries or data privacy requests, contact us at privacy@quickmart.in.
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
