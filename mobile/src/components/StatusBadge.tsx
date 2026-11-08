import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OrderStatus } from '../types';
import { Colors, Typography, BorderRadius } from '../theme';

interface StatusBadgeProps {
  status: OrderStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let bgColor = Colors.primarySubtle;
  let textColor = Colors.primaryDark;

  if (status === 'Cancelled') {
    bgColor = Colors.dangerLight;
    textColor = Colors.danger;
  } else if (status === 'Out for Delivery') {
    bgColor = Colors.accentLight;
    textColor = '#B45309';
  } else if (status === 'Delivered') {
    bgColor = '#DCFCE7';
    textColor = '#15803D';
  }

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
});
