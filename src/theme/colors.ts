/**
 * Design System — Color Palette
 *
 * Primary: Indigo — distinctive, premium, modern
 * Semantic: Emerald (income), Red (expense), Amber (warning)
 * Neutrals: Slate palette (cool, clean)
 */

export const palette = {
  // Indigo
  indigo50: '#EEF2FF',
  indigo100: '#E0E7FF',
  indigo200: '#C7D2FE',
  indigo300: '#A5B4FC',
  indigo400: '#818CF8',
  indigo500: '#6366F1',
  indigo600: '#4F46E5',
  indigo700: '#4338CA',
  indigo800: '#3730A3',
  indigo900: '#312E81',

  // Emerald (income)
  emerald50: '#ECFDF5',
  emerald100: '#D1FAE5',
  emerald400: '#34D399',
  emerald500: '#10B981',
  emerald600: '#059669',

  // Red (expense)
  red50: '#FEF2F2',
  red100: '#FEE2E2',
  red400: '#F87171',
  red500: '#EF4444',
  red600: '#DC2626',

  // Amber (warning)
  amber50: '#FFFBEB',
  amber100: '#FEF3C7',
  amber400: '#FBBF24',
  amber500: '#F59E0B',
  amber600: '#D97706',

  // Slate (neutrals)
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  slate950: '#020617',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export const lightColors = {
  primary: palette.indigo500,
  primaryLight: palette.indigo400,
  primaryDark: palette.indigo600,
  primaryFaint: palette.indigo50,

  background: palette.slate50,
  surface: palette.white,
  surfaceSecondary: palette.slate100,
  card: palette.white,
  input: palette.slate100,

  text: palette.slate900,
  textSecondary: palette.slate500,
  textTertiary: palette.slate400,
  textInverse: palette.white,

  border: palette.slate200,
  borderLight: palette.slate100,
  divider: palette.slate100,

  income: palette.emerald500,
  incomeBg: palette.emerald50,
  expense: palette.red500,
  expenseBg: palette.red50,
  warning: palette.amber500,
  warningBg: palette.amber50,

  tabBar: palette.white,
  tabBarBorder: palette.slate200,
  tabBarActive: palette.indigo500,
  tabBarInactive: palette.slate400,

  skeleton: palette.slate200,
  overlay: 'rgba(0,0,0,0.5)',

  // Hero gradient stops
  heroGradient: [palette.indigo500, palette.indigo600, palette.indigo700] as const,
  // Background gradient stops
  bgGradient: ['#F8FAFC', '#F5F3FF', '#F8FAFC'] as const,
} as const;

export const darkColors = {
  primary: palette.indigo400,
  primaryLight: palette.indigo300,
  primaryDark: palette.indigo500,
  primaryFaint: 'rgba(99,102,241,0.1)',

  background: palette.slate950,
  surface: palette.slate900,
  surfaceSecondary: palette.slate800,
  card: palette.slate800,
  input: palette.slate800,

  text: palette.white,
  textSecondary: palette.slate400,
  textTertiary: palette.slate500,
  textInverse: palette.slate900,

  border: palette.slate700,
  borderLight: palette.slate800,
  divider: palette.slate800,

  income: palette.emerald400,
  incomeBg: 'rgba(16,185,129,0.1)',
  expense: palette.red400,
  expenseBg: 'rgba(239,68,68,0.1)',
  warning: palette.amber400,
  warningBg: 'rgba(245,158,11,0.1)',

  tabBar: palette.slate900,
  tabBarBorder: palette.slate800,
  tabBarActive: palette.indigo400,
  tabBarInactive: palette.slate600,

  skeleton: palette.slate700,
  overlay: 'rgba(0,0,0,0.7)',

  heroGradient: [palette.indigo600, palette.indigo700, palette.indigo800] as const,
  bgGradient: [palette.slate950, palette.slate950, palette.slate950] as const,
} as const;

/** Semantic color for budget progress percentage */
export function budgetColor(pct: number): string {
  if (pct >= 100) return palette.red500;
  if (pct >= 85) return palette.amber500;
  if (pct >= 65) return palette.indigo500;
  return palette.emerald500;
}

/** Category chart colors — used for graphs and distribution visuals */
export const chartColors = [
  palette.indigo500,
  palette.emerald500,
  palette.amber500,
  palette.red500,
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#84CC16', // lime
];
