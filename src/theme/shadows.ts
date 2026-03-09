/**
 * Design System — Shadow / Elevation Levels
 *
 * Platform-aware shadows.
 * For NativeWind components use `shadow-sm`, `shadow-md` classes.
 * These are for programmatic use (Animated, conditional styles).
 */
import { Platform, ViewStyle } from 'react-native';

type ShadowLevel = Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

const SHADOW_COLOR = '#6366F1'; // Indigo-tinted shadows for brand cohesion

export const shadows: Record<'none' | 'sm' | 'md' | 'lg' | 'xl', ShadowLevel> = {
  none: {},

  sm: Platform.select({
    ios: {
      shadowColor: SHADOW_COLOR,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    android: { elevation: 2 },
    default: {},
  }) as ShadowLevel,

  md: Platform.select({
    ios: {
      shadowColor: SHADOW_COLOR,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: { elevation: 4 },
    default: {},
  }) as ShadowLevel,

  lg: Platform.select({
    ios: {
      shadowColor: SHADOW_COLOR,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
    },
    android: { elevation: 8 },
    default: {},
  }) as ShadowLevel,

  xl: Platform.select({
    ios: {
      shadowColor: SHADOW_COLOR,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 30,
    },
    android: { elevation: 12 },
    default: {},
  }) as ShadowLevel,
};
