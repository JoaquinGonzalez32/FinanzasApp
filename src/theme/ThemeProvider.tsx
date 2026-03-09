/**
 * Theme Provider — Light/Dark mode context
 *
 * Uses NativeWind's useColorScheme so `dark:` classes respond correctly.
 * Persists user preference in AsyncStorage.
 */
import React, { createContext, useMemo, useEffect, useState, useCallback } from 'react';
import { useColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from './colors';

const STORAGE_KEY = 'finanza_theme_mode';

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
  const { colorScheme, setColorScheme } = useColorScheme();
  const [mode, setModeState] = useState<Mode>('system');
  const [loaded, setLoaded] = useState(false);

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
        setColorScheme(stored);
      }
      setLoaded(true);
    });
  }, []);

  const setMode = useCallback((newMode: Mode) => {
    setModeState(newMode);
    setColorScheme(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode);
  }, [setColorScheme]);

  const isDark = colorScheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const toggle = useCallback(() => {
    const next: Mode = isDark ? 'light' : 'dark';
    setMode(next);
  }, [isDark, setMode]);

  const value = useMemo(
    () => ({ mode, isDark, colors, setMode, toggle }),
    [mode, isDark, colors, setMode, toggle],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
