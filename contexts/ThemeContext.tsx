/**
 * ThemeContext
 *
 * App-wide appearance preference: follow the system, or pin light/dark.
 * The choice persists across launches (AsyncStorage) and propagates through
 * the existing `@/hooks/use-color-scheme` hook, so every screen that already
 * branches on the scheme follows it with no per-screen changes.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme_preference';

interface ThemeContextValue {
  /** What the user chose in settings. */
  preference: ThemePreference;
  /** What the app should render right now. */
  resolved: 'light' | 'dark';
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const system = useSystemColorScheme() ?? 'light';
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [hydrated, setHydrated] = useState(false);

  // Load the stored choice before first paint — the native splash is still
  // up at this point, so holding children back never flashes.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPreferenceState(v);
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  };

  const resolved: 'light' | 'dark' = preference === 'system' ? system : preference;

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved],
  );

  if (!hydrated) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Theme preference + setter. Throws outside the provider. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within AppThemeProvider');
  return ctx;
}

/** Non-throwing variant for code that may render outside the provider. */
export function useThemeSafe(): ThemeContextValue | null {
  return useContext(ThemeContext);
}
