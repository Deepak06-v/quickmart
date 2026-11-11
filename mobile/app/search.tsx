import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ProductCard } from '../src/components/ProductCard';
import { EmptyState } from '../src/components/EmptyState';
import { api } from '../src/api/client';
import { IProduct } from '../src/types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/theme';

const POPULAR_SEARCHES = ['Onions', 'Milk', 'Wheat Atta', 'Basmati Rice', 'Potatoes', 'Mustard Oil', 'Tea'];

export default function SearchScreen() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // 300ms debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchTerm.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () =>
      api.get<{ success: boolean; products: IProduct[] }>(
        `/products/search?q=${encodeURIComponent(debouncedQuery)}`
      ),
    enabled: debouncedQuery.length > 0,
  });

  const searchResults = data?.products || [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Search Input Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Search groceries, atta, dairy..."
            placeholderTextColor={Colors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoFocus
            returnKeyType="search"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Popular Chips when query is empty */}
      {debouncedQuery.length === 0 ? (
        <View style={styles.popularContainer}>
          <Text style={styles.popularTitle}>Popular Searches</Text>
          <View style={styles.chipsRow}>
            {POPULAR_SEARCHES.map((term) => (
              <TouchableOpacity
                key={term}
                onPress={() => setSearchTerm(term)}
                style={styles.chip}
              >
                <Ionicons name="trending-up" size={14} color={Colors.primaryDark} />
                <Text style={styles.chipText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : searchResults.length === 0 ? (
        <EmptyState
          iconName="search-outline"
          title="No Products Found"
          description={`We couldn't find any products matching "${debouncedQuery}". Try checking for spelling or searching for another grocery essential.`}
        />
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.resultsGrid}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item }) => <ProductCard product={item} layout="grid" />}
          showsVerticalScrollIndicator={false}
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.base,
    color: Colors.text,
  },
  popularContainer: {
    padding: Spacing.lg,
  },
  popularTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  chipText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsGrid: {
    padding: Spacing.lg,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
});
