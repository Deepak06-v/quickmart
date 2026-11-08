import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLocationStore } from '../store/locationStore';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme';

interface HeaderProps {
  onOpenLocationModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenLocationModal }) => {
  const router = useRouter();
  const locationName = useLocationStore((state) => state.locationName);
  const estimatedMinutes = useLocationStore((state) => state.estimatedMinutes);
  const isDeliverable = useLocationStore((state) => state.isDeliverable);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning ☀️';
    if (hour < 17) return 'Good Afternoon 🌤️';
    return 'Good Evening 🌙';
  };

  return (
    <View style={styles.container}>
      {/* Top Location and ETA Row */}
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={onOpenLocationModal}
          style={styles.locationButton}
          activeOpacity={0.75}
        >
          <View style={styles.locationIconWrapper}>
            <Ionicons name="location" size={18} color={Colors.primary} />
          </View>
          <View style={styles.locationTextContainer}>
            <View style={styles.locationHeaderRow}>
              <Text style={styles.deliverToText}>DELIVER TO</Text>
              <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
            </View>
            <Text style={styles.locationTitle} numberOfLines={1}>
              {locationName}
            </Text>
          </View>
        </TouchableOpacity>

        {isDeliverable && (
          <View style={styles.etaPill}>
            <Ionicons name="flash" size={14} color={Colors.accent} />
            <Text style={styles.etaText}>
              {estimatedMinutes ? `~${estimatedMinutes} mins` : '~25 mins'}
            </Text>
          </View>
        )}
      </View>

      {/* Greeting */}
      <Text style={styles.greetingText}>{getGreeting()}</Text>

      {/* Search Bar Input / Trigger */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push('/search')}
        style={styles.searchBar}
      >
        <Ionicons name="search-outline" size={20} color={Colors.textMuted} />
        <Text style={styles.searchPlaceholder}>Search "atta", "milk", "onion", "tea"...</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  locationIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  deliverToText: {
    fontSize: Typography.sizes.xs - 1,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  locationTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  etaText: {
    fontSize: Typography.sizes.xs + 1,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  greetingText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadows.subtle,
  },
  searchPlaceholder: {
    fontSize: Typography.sizes.base - 1,
    color: Colors.textMuted,
    flex: 1,
  },
});
