/**
 * Theme Provider — Light/Dark mode context
 *
 * Provides:
 * - Current color scheme (auto-detects system preference)
 * - Manual override capability
 * - Current theme colors for programmatic access
 *
 * NativeWind handles component styling via `dark:` prefix automatically.
 * This provider is for charts, animations, and conditional JS logic.
 */
import React, { createContext, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from './colors';

type Mode = 'light' | 'dark' | 'system';

type ThemeColors = typeof lightColors | typeof darkColors;

interface ThemeContextValue {
  mode: Mode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: Mode) => void;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  isDark: false,
  colors: lightColors,
  setMode: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<Mode>('system');

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const toggle = useCallback(() => {
    setMode(prev => {
      if (prev === 'system') return isDark ? 'light' : 'dark';
      return prev === 'dark' ? 'light' : 'dark';
    });
  }, [isDark]);

  const value = useMemo(
    () => ({ mode, isDark, colors, setMode, toggle }),
    [mode, isDark, colors, toggle],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
