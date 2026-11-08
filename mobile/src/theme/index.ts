export const Colors = {
  primary: '#10B981', // Crisp Emerald
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  primarySubtle: '#ECFDF5',

  accent: '#F59E0B',
  accentLight: '#FEF3C7',

  danger: '#EF4444',
  dangerLight: '#FEE2E2',

  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',

  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',
  surfaceHover: '#E2E8F0',

  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textLight: '#CBD5E1',
  textInverse: '#FFFFFF',

  border: '#E2E8F0',
  borderFocus: '#10B981',
  divider: '#F1F5F9',

  badgeDiscount: '#DC2626',
  badgeDiscountBg: '#FEE2E2',

  badgeOffer: '#F97316',
};

export const Typography = {
  fontFamily: undefined, // Uses native system font (Roboto on Android, San Francisco on iOS)
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    display: 30,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  huge: 32,
};

export const BorderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999,
};

// Platform-aware shadow helper: uses boxShadow on web, native shadow props on Android/iOS.
// This eliminates "shadow* style props are deprecated" warnings in Expo Web.
const makeShadow = (
  y: number,
  blur: number,
  opacity: number,
  elevation: number,
): object => {
  if (typeof navigator !== 'undefined' && navigator.product !== 'ReactNative') {
    // Web
    return {
      boxShadow: `0px ${y}px ${blur}px rgba(15, 23, 42, ${opacity})`,
    };
  }
  return {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: y },
    shadowOpacity: opacity,
    shadowRadius: blur / 2,
    elevation,
  };
};

export const Shadows = {
  subtle: makeShadow(2, 6, 0.04, 2),
  card: makeShadow(4, 10, 0.06, 3),
  floating: makeShadow(8, 16, 0.12, 6),
};
