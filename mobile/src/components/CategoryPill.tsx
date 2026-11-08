import React from 'react';
import { TouchableOpacity, Text, Image, StyleSheet, View } from 'react-native';
import { ICategory } from '../types';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

interface CategoryPillProps {
  category: ICategory;
  isSelected?: boolean;
  onPress: () => void;
}

export const CategoryPill: React.FC<CategoryPillProps> = ({
  category,
  isSelected = false,
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.container, isSelected && styles.containerSelected]}
    >
      <View style={[styles.imageWrapper, isSelected && styles.imageWrapperSelected]}>
        <Image
          source={{ uri: category.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      </View>
      <Text
        style={[styles.name, isSelected && styles.nameSelected]}
        numberOfLines={2}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 76,
    marginRight: Spacing.sm,
  },
  containerSelected: {
    transform: [{ scale: 1.02 }],
  },
  imageWrapper: {
    width: 62,
    height: 62,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSubtle,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  imageWrapperSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySubtle,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  nameSelected: {
    color: Colors.primaryDark,
    fontWeight: Typography.weights.bold,
  },
});
