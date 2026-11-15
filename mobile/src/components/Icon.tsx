import React from 'react';
import { StyleProp, ViewStyle, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import pathsData from './ioniconsPaths.json';

const ioniconsPaths: Record<string, string> = pathsData;

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const Ionicons: React.FC<IconProps> & {
  glyphMap: Record<string, number>;
  font: Record<string, any>;
  loadFont: () => Promise<void>;
  Button: any;
} = ({
  name,
  size = 24,
  color = '#000000',
  style,
}) => {
  const cleanName = String(name || '').trim();
  const path =
    ioniconsPaths[cleanName] ||
    ioniconsPaths[cleanName.replace(/^(ios-|md-)/, '')] ||
    ioniconsPaths[`${cleanName}-outline`] ||
    ioniconsPaths[cleanName.replace(/-outline$/, '')] ||
    ioniconsPaths['alert-circle'];

  if (!path) {
    return <View style={[{ width: size, height: size }, style]} />;
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 1000 1000"
      style={style}
      accessibilityRole="image"
    >
      <Path d={path} fill={color} />
    </Svg>
  );
};

// Static properties for backward compatibility
Ionicons.glyphMap = ioniconsPaths as any;
Ionicons.font = { ionicons: 1 };
Ionicons.loadFont = () => Promise.resolve();
Ionicons.Button = () => null;

export const Icon = Ionicons;
export default Ionicons;
