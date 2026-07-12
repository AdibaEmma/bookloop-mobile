import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useThemeSafe } from '@/contexts/ThemeContext';

/**
 * The app's single source of truth for the active color scheme.
 *
 * Resolves the user's in-app appearance preference (system / light / dark)
 * when the ThemeProvider is mounted, and falls back to the OS scheme outside
 * it. Every screen already reads through this hook, so the preference
 * applies app-wide.
 */
export function useColorScheme(): 'light' | 'dark' {
  const system = useSystemColorScheme() ?? 'light';
  const theme = useThemeSafe();
  return theme?.resolved ?? system;
}
