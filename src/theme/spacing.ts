/**
 * Design System — Spacing Scale
 *
 * Base unit: 4px
 * Used for margins, padding, gaps, border radius
 */

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

export const radii = {
  none: 0,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

/** Minimum touch target for accessibility — 44pt */
export const TOUCH_TARGET = 44;

/** Standard horizontal padding for tab screens */
export const SCREEN_PADDING_X = spacing[5]; // 20

/** Standard horizontal padding for modals */
export const MODAL_PADDING_X = spacing[6]; // 24

/** Bottom padding to clear tab bar */
export const TAB_BAR_CLEARANCE = 100;
