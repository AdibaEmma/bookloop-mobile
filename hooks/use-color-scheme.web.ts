import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useThemeSafe } from '@/contexts/ThemeContext';

/**
 * Web variant: static rendering needs the scheme re-calculated client-side,
 * then the in-app preference wins once hydrated (same contract as native).
 */
export function useColorScheme(): 'light' | 'dark' {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const system = useRNColorScheme() ?? 'light';
  const theme = useThemeSafe();

  if (!hasHydrated) return 'light';
  return theme?.resolved ?? system;
}
