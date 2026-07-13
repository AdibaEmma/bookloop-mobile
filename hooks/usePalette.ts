import { useColorScheme } from './use-color-scheme';
import { Palettes, Palette } from '@/constants/palette';

/** The active semantic palette — follows the in-app appearance preference. */
export function usePalette(): Palette {
  const scheme = useColorScheme() ?? 'light';
  return scheme === 'dark' ? Palettes.dark : Palettes.light;
}
