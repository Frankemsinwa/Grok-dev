import { Platform, StyleSheet, TextStyle, ViewStyle } from 'react-native';

export const Colors = {
  background: '#0B0D10',
  surface: '#111418',
  surfaceElevated: '#171A1F',
  surfaceMuted: '#0F1216',
  border: '#1F242B',
  borderStrong: '#2A3038',
  textPrimary: '#FFFFFF',
  textSecondary: '#8A919C',
  textMuted: '#5C636C',
  accent: '#4F8CFF',
  accentMuted: '#2C4A80',
  success: '#3FB950',
  warning: '#D29922',
  danger: '#F85149',
  white: '#FFFFFF',
  black: '#000000',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const Font = {
  sizeXS: 11,
  sizeSM: 12,
  sizeMD: 14,
  sizeLG: 16,
  sizeXL: 18,
  sizeXXL: 24,
  sizeXXXL: 30,
  sans: Platform.OS === 'ios' ? 'system' : 'sans-serif',
  mono: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
};

export const Shadows = StyleSheet.create({
  card: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  } as ViewStyle,
});

export const Typography = StyleSheet.create({
  title: {
    color: Colors.textPrimary,
    fontSize: Font.sizeXXL,
    fontWeight: '700',
    fontFamily: Font.sans,
  } as TextStyle,
  heading: {
    color: Colors.textPrimary,
    fontSize: Font.sizeLG,
    fontWeight: '600',
    fontFamily: Font.sans,
  } as TextStyle,
  body: {
    color: Colors.textSecondary,
    fontSize: Font.sizeMD,
    fontFamily: Font.sans,
    lineHeight: 22,
  } as TextStyle,
  caption: {
    color: Colors.textMuted,
    fontSize: Font.sizeSM,
    fontFamily: Font.sans,
  } as TextStyle,
  mono: {
    color: Colors.textSecondary,
    fontSize: Font.sizeSM,
    fontFamily: Font.mono,
  } as TextStyle,
});

export const globalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardPadding: {
    padding: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Font.sizeMD,
    fontWeight: '600',
    fontFamily: Font.sans,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
});
