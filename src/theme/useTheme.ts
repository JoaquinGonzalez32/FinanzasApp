import { useContext } from 'react';
import { ThemeContext } from './ThemeProvider';

/**
 * Access current theme colors and mode.
 * For NativeWind components, prefer `dark:` className prefix.
 * Use this hook for charts, animations, and programmatic color logic.
 */
export function useTheme() {
  return useContext(ThemeContext);
}
