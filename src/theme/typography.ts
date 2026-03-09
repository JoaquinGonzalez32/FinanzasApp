/**
 * Design System — Typography Scale
 *
 * Font: Manrope (5 weights loaded)
 * Scale: Clear hierarchy from captions to display numbers
 */

export const fontFamilies = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

export const fontSizes = {
  /** 10px — Tiny labels, badges */
  '2xs': 10,
  /** 12px — Captions, secondary text */
  xs: 12,
  /** 14px — Body text, list items */
  sm: 14,
  /** 16px — Emphasis body, input text */
  base: 16,
  /** 18px — Section titles */
  lg: 18,
  /** 20px — Screen headers */
  xl: 20,
  /** 24px — Large headers */
  '2xl': 24,
  /** 28px — Small display amounts */
  '3xl': 28,
  /** 36px — Medium display amounts */
  '4xl': 36,
  /** 48px — Hero numbers */
  '5xl': 48,
} as const;

export const lineHeights = {
  tight: 1.1,
  snug: 1.2,
  normal: 1.4,
  relaxed: 1.6,
} as const;

/**
 * Pre-composed text styles for common use cases.
 * Use these for programmatic styling (charts, animations).
 * For NativeWind components, use the equivalent Tailwind classes.
 */
export const textStyles = {
  displayLg: {
    fontFamily: fontFamilies.extrabold,
    fontSize: fontSizes['5xl'],
    lineHeight: fontSizes['5xl'] * lineHeights.tight,
  },
  displayMd: {
    fontFamily: fontFamilies.extrabold,
    fontSize: fontSizes['4xl'],
    lineHeight: fontSizes['4xl'] * lineHeights.tight,
  },
  displaySm: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes['3xl'],
    lineHeight: fontSizes['3xl'] * lineHeights.snug,
  },
  headingLg: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    lineHeight: fontSizes.xl * lineHeights.snug,
  },
  headingSm: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * lineHeights.snug,
  },
  label: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * lineHeights.normal,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.normal,
  },
  bodyMedium: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.normal,
  },
  caption: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * lineHeights.normal,
  },
  amount: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.tight,
  },
  amountLg: {
    fontFamily: fontFamilies.extrabold,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * lineHeights.tight,
  },
} as const;
