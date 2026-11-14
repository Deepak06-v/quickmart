import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../src/components/Header';
import { ProductCard } from '../../src/components/ProductCard';
import { CategoryPill } from '../../src/components/CategoryPill';
import { LocationPickerModal } from '../../src/components/LocationPickerModal';
import { useLocationStore } from '../../src/store/locationStore';
import { api } from '../../src/api/client';
import { ICategory, IProduct } from '../../src/types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/theme';

const INITIAL_BATCH_SIZE = 4;

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);

  // Independent pagination states for Super Saver Offers and Daily Essentials
  const [visibleOffersCount, setVisibleOffersCount] = useState(INITIAL_BATCH_SIZE);
  const [visibleRecommendedCount, setVisibleRecommendedCount] = useState(INITIAL_BATCH_SIZE);

  const isDeliverable = useLocationStore((state) => state.isDeliverable);
  const serviceMessage = useLocationStore((state) => state.serviceMessage);

  // 1. Fetch Categories
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ success: boolean; categories: ICategory[] }>('/categories'),
  });

  // 2. Fetch Offers
  const {
    data: offersData,
    isLoading: offersLoading,
    refetch: refetchOffers,
  } = useQuery({
    queryKey: ['offers'],
    queryFn: () => api.get<{ success: boolean; products: IProduct[] }>('/products/offers'),
  });

  // 3. Fetch Recommended
  const {
    data: recommendedData,
    isLoading: recommendedLoading,
    refetch: refetchRecommended,
  } = useQuery({
    queryKey: ['recommended'],
    queryFn: () => api.get<{ success: boolean; products: IProduct[] }>('/products/recommended'),
  });

  // 4. Fetch All Products
  const {
    data: productsData,
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['products', selectedCategorySlug],
    queryFn: () => {
      const endpoint = selectedCategorySlug
        ? `/categories/${selectedCategorySlug}/products`
        : '/products?limit=30';
      return api.get<{ success: boolean; products: IProduct[] }>(endpoint);
    },
  });

  const isRefreshing = categoriesLoading || offersLoading || productsLoading;

  const handleRefresh = async () => {
    await Promise.all([
      refetchCategories(),
      refetchOffers(),
      refetchRecommended(),
      refetchProducts(),
    ]);
  };

  const categories = categoriesData?.categories || [];
  const offers = offersData?.products || [];
  const recommended = recommendedData?.products || [];
  const products = productsData?.products || [];

  // Width calculations for reliable multi-column grids
  // Categories: 3 per row on normal mobile screens, 2 on narrow screens (< 340px)
  const numCategoryColumns = width < 340 ? 2 : 3;
  const categoryGap = 8;
  const categoryCardWidth = Math.floor(
    (width - Spacing.lg * 2 - (numCategoryColumns - 1) * categoryGap) / numCategoryColumns
  );

  // Products: exactly 2 per row
  const productCardWidth = Math.floor((width - Spacing.lg * 2 - Spacing.md - 2) / 2);

  // Visible slices for independent 2-column grids
  const visibleOffers = offers.slice(0, visibleOffersCount);
  const hasMoreOffers = visibleOffersCount < offers.length;

  const visibleRecommended = recommended.slice(0, visibleRecommendedCount);
  const hasMoreRecommended = visibleRecommendedCount < recommended.length;

  const handleLoadMoreOffers = () => {
    setVisibleOffersCount((prev) => prev + INITIAL_BATCH_SIZE);
  };

  const handleLoadMoreRecommended = () => {
    setVisibleRecommendedCount((prev) => prev + INITIAL_BATCH_SIZE);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <Header onOpenLocationModal={() => setLocationModalVisible(true)} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Serviceability Warning Banner if outside delivery area */}
        {!isDeliverable && (
          <View style={styles.serviceBanner}>
            <Ionicons name="alert-circle" size={18} color="#B45309" />
            <View style={styles.serviceBannerTextCol}>
              <Text style={styles.serviceBannerTitle}>Delivery Currently Unavailable</Text>
              <Text style={styles.serviceBannerDesc}>
                {serviceMessage ||
                  'Your current location is outside our service radius. You can still browse products, but orders require a serviceable delivery address.'}
              </Text>
            </View>
          </View>
        )}

        {/* 1. Categories Section — Small Rectangular Grid Cards (3 per row, vertically stacked) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Shop by Category</Text>
          {selectedCategorySlug && (
            <TouchableOpacity onPress={() => setSelectedCategorySlug(null)}>
              <Text style={styles.clearFilterText}>Show All</Text>
            </TouchableOpacity>
          )}
        </View>

        {categories.length > 0 ? (
          <View style={styles.categoriesGrid}>
            {categories.map((cat) => (
              <CategoryPill
                key={cat._id}
                category={cat}
                width={categoryCardWidth}
                isSelected={selectedCategorySlug === cat.slug}
                onPress={() =>
                  setSelectedCategorySlug(
                    selectedCategorySlug === cat.slug ? null : cat.slug
                  )
                }
              />
            ))}
          </View>
        ) : !categoriesLoading ? (
          <View style={styles.emptyCategoriesContainer}>
            <Text style={styles.emptyCategoriesText}>No categories available yet.</Text>
          </View>
        ) : null}

        {/* 2. Super Saver Offers — Two-Column Vertical Grid with Independent Load More */}
        {!selectedCategorySlug && offers.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.titleWithIcon}>
                <Ionicons name="flame" size={20} color={Colors.badgeDiscount} />
                <Text style={styles.sectionTitle}>Super Saver Offers</Text>
              </View>
            </View>

            <View style={styles.productsGrid}>
              {visibleOffers.map((item) => (
                <ProductCard
                  key={item._id}
                  product={item}
                  layout="grid"
                  cardWidth={productCardWidth}
                />
              ))}
            </View>

            {hasMoreOffers && (
              <View style={styles.loadMoreWrapper}>
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  activeOpacity={0.8}
                  onPress={handleLoadMoreOffers}
                >
                  <Text style={styles.loadMoreButtonText}>Load More Offers</Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.primaryDark} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* 3. Daily Essentials — Two-Column Vertical Grid with Independent Load More */}
        {!selectedCategorySlug && recommended.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.titleWithIcon}>
                <Ionicons name="sparkles" size={18} color={Colors.accent} />
                <Text style={styles.sectionTitle}>Daily Essentials</Text>
              </View>
            </View>

            <View style={styles.productsGrid}>
              {visibleRecommended.map((item) => (
                <ProductCard
                  key={item._id}
                  product={item}
                  layout="grid"
                  cardWidth={productCardWidth}
                />
              ))}
            </View>

            {hasMoreRecommended && (
              <View style={styles.loadMoreWrapper}>
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  activeOpacity={0.8}
                  onPress={handleLoadMoreRecommended}
                >
                  <Text style={styles.loadMoreButtonText}>Load More Essentials</Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.primaryDark} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* 4. All Fresh Groceries — Two-Column Product Grid */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {selectedCategorySlug
                ? categories.find((c) => c.slug === selectedCategorySlug)?.name || 'Products'
                : 'All Fresh Groceries'}
            </Text>
            <Text style={styles.productCountText}>{products.length} items</Text>
          </View>

          {productsLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : products.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="basket-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {selectedCategorySlug
                  ? 'No items available in this category'
                  : 'No products available yet.'}
              </Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {products.map((item) => (
                <ProductCard
                  key={item._id}
                  product={item}
                  layout="grid"
                  cardWidth={productCardWidth}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Location Picker Sheet Modal */}
      <LocationPickerModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
      />
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
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingBottom: Spacing.huge,
  },
  serviceBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.accentLight,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: Spacing.sm,
  },
  serviceBannerTextCol: {
    flex: 1,
  },
  serviceBannerTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: '#92400E',
    marginBottom: 2,
  },
  serviceBannerDesc: {
    fontSize: Typography.sizes.xs,
    color: '#78350F',
    lineHeight: 16,
  },
  sectionContainer: {
    marginTop: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  clearFilterText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryDark,
  },
  productCountText: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.textMuted,
    fontWeight: Typography.weights.medium,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  loadMoreWrapper: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 10,
    paddingHorizontal: Spacing.xl,
    gap: 6,
    ...Shadows.subtle,
  },
  loadMoreButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryDark,
  },
  loaderContainer: {
    paddingVertical: Spacing.huge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  emptyCategoriesContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  emptyCategoriesText: {
    fontSize: Typography.sizes.xs + 1,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});
