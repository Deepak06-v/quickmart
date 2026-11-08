import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, BorderRadius } from '../theme';

interface QuantityControllerProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const QuantityController: React.FC<QuantityControllerProps> = ({
  quantity,
  onIncrease,
  onDecrease,
  size = 'md',
}) => {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const containerHeight = isSm ? 30 : isLg ? 44 : 36;
  const iconSize = isSm ? 14 : isLg ? 20 : 16;
  const paddingH = isSm ? 6 : isLg ? 14 : 10;
  const fontSize = isSm ? Typography.sizes.sm : isLg ? Typography.sizes.lg : Typography.sizes.base;

  return (
    <View style={[styles.container, { height: containerHeight, paddingHorizontal: paddingH }]}>
      <TouchableOpacity
        onPress={onDecrease}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.button}
        accessibilityLabel="Decrease quantity"
      >
        <Ionicons name="remove" size={iconSize} color={Colors.primaryDark} />
      </TouchableOpacity>

      <Text style={[styles.quantityText, { fontSize }]}>{quantity}</Text>

      <TouchableOpacity
        onPress={onIncrease}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.button}
        accessibilityLabel="Increase quantity"
      >
        <Ionicons name="add" size={iconSize} color={Colors.primaryDark} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primarySubtle,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    minWidth: 84,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  quantityText: {
    fontWeight: Typography.weights.bold,
    color: Colors.primaryDark,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
