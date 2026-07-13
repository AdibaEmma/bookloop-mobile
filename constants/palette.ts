/**
 * Semantic palette — the single source of truth for themed screens.
 *
 * Screens take colors from `usePalette()` instead of hand-rolling local
 * LIGHT_C/DARK_C pairs; both modes stay in one place and new screens can't
 * drift. Values are the warm book-paper set already used across the app.
 */

import { BookLoopColors } from './theme';

const light = {
    bg: BookLoopColors.cream,
    bgTop: BookLoopColors.creamTop,
    surface: '#FFFFFF',
    surfaceRaised: 'rgba(255,251,244,0.96)',
    border: '#EFE2CE',
    borderSoft: 'rgba(139,94,60,0.14)',
    text: BookLoopColors.deepEspresso,
    textMuted: BookLoopColors.authorText,
    textFaint: '#B39C82',
    accent: BookLoopColors.coffeeBrown,
    accentAlt: BookLoopColors.burntOrange,
    gold: BookLoopColors.mutedGold,
    goldDeep: BookLoopColors.goldDeep,
    tint: 'rgba(139,94,60,0.10)',
    goldTint: 'rgba(230,185,91,0.22)',
};

/** Every mode provides the same keys; values are plain color strings. */
export type Palette = { [K in keyof typeof light]: string };

const dark: Palette = {
    bg: BookLoopColors.darkBg,
    bgTop: BookLoopColors.darkBgDeep,
    surface: '#2C1F18',
    surfaceRaised: 'rgba(36,26,18,0.97)',
    border: '#3D2E24',
    borderSoft: '#4A4238',
    text: BookLoopColors.darkText,
    textMuted: BookLoopColors.darkTextMuted,
    textFaint: '#8C7660',
    accent: BookLoopColors.burntOrange,
    accentAlt: BookLoopColors.burntOrange,
    gold: BookLoopColors.mutedGold,
    goldDeep: BookLoopColors.goldDeep,
    tint: 'rgba(217,121,65,0.14)',
    goldTint: 'rgba(230,185,91,0.16)',
};

export const Palettes = { light, dark };
