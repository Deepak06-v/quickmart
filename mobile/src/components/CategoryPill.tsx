import React from 'react';
import { TouchableOpacity, Text, Image, StyleSheet, View } from 'react-native';
import { ICategory } from '../types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme';

interface CategoryPillProps {
  category: ICategory;
  isSelected?: boolean;
  onPress: () => void;
  width?: number;
}

export const CategoryPill: React.FC<CategoryPillProps> = ({
  category,
  isSelected = false,
  onPress,
  width,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.card,
        width ? { width } : null,
        isSelected && styles.cardSelected,
      ]}
    >
      <View style={[styles.thumbnailWrapper, isSelected && styles.thumbnailWrapperSelected]}>
        <Image
          source={{ uri: category.imageUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      </View>
      <View style={styles.textWrapper}>
        <Text
          style={[styles.name, isSelected && styles.nameSelected]}
          numberOfLines={2}
        >
          {category.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: Spacing.sm,
    ...Shadows.subtle,
  },
  cardSelected: {
    backgroundColor: Colors.primarySubtle,
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  thumbnailWrapper: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.xs + 2,
    backgroundColor: Colors.surfaceSubtle,
    overflow: 'hidden',
  },
  thumbnailWrapperSelected: {
    backgroundColor: Colors.primaryLight,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  textWrapper: {
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
  },
  name: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    lineHeight: 14,
  },
  nameSelected: {
    color: Colors.primaryDark,
    fontWeight: Typography.weights.bold,
  },
});
