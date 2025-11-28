/**
 * BookLoop Design System
 *
 * A "cozy library" aesthetic with modern glassmorphic design.
 * Ghana-first platform for book exchanges.
 *
 * Design Philosophy:
 * - Warm, inviting colors (coffee browns, cream)
 * - Glassmorphism with backdrop blur
 * - Comfortable reading experience
 * - Accessible and clear typography
 *
 * Color Palette:
 * - Primary: Coffee Brown (#8B5E3C) - warm, trustworthy
 * - Secondary: Cream (#F5E6D3) - soft, paper-like
 * - Accent: Burnt Orange (#D97941) - highlights, CTAs
 * - Dark: Deep Brown (#2C1810) - text, depth
 */

import { Platform } from 'react-native';

/**
 * BookLoop Color Palette
 *
 * Design Document Reference:
 * - Coffee Brown: #8B5E3C (primary actions, headers)
 * - Muted Gold: #FFD580 (accents, highlights, badges)
 * - Parchment Beige: #F4E1C1 (backgrounds, cards)
 * - Deep Espresso: #4A3528 (text primary)
 * - Soft Latte: #D4B896 (text secondary)
 */
export const BookLoopColors = {
  // Primary Colors (from design doc)
  coffeeBrown: '#8B5E3C',
  mutedGold: '#FFD580',
  parchmentBeige: '#F4E1C1',
  deepEspresso: '#4A3528',
  softLatte: '#D4B896',

  // Secondary/Legacy Colors
  cream: '#FFF8F0', // White alternative
  burntOrange: '#D97941',
  deepBrown: '#2C1810',

  // Neutral Colors
  warmGray: '#8B7E74',
  lightGray: '#E8E3DE',
  lightPeach: '#FAF3E0',
  darkGray: '#4A4238',
  charcoal: '#1A1A1A',

  // Listing Type Colors
  teal: '#16B8AC',
  sage: '#87A96B',

  // Semantic Colors
  success: '#4CAF50',
  warning: '#FF9800', // Warning Amber from design doc
  error: '#F44336', // Error Red from design doc
  info: '#2196F3', // Info Blue from design doc

  // Badge Colors
  verifiedBadge: '#FFD580', // Gold for verified users
  boostedListing: '#FF9800', // Amber glow for boosted
  premiumFeature: '#8B5E3C', // Brown for premium

  // Glass Colors (with alpha for glassmorphism)
  glassLight: 'rgba(244, 225, 193, 0.7)', // Parchment Beige with transparency
  glassDark: 'rgba(44, 24, 16, 0.7)', // Deep brown with transparency
  glassWhite: 'rgba(255, 255, 255, 0.2)',
  glassBlack: 'rgba(0, 0, 0, 0.3)',
  glassGold: 'rgba(255, 213, 128, 0.3)', // Muted gold with transparency
};

/**
 * Theme Colors for Light/Dark Modes
 */
export const Colors = {
  light: {
    // Text (using design doc colors)
    text: BookLoopColors.deepEspresso,
    textSecondary: BookLoopColors.softLatte,
    textInverse: BookLoopColors.cream,

    // Backgrounds (using design doc colors)
    background: BookLoopColors.parchmentBeige,
    backgroundSecondary: BookLoopColors.cream,
    surface: BookLoopColors.lightGray,
    card: BookLoopColors.cream,

    // Primary & Actions
    primary: BookLoopColors.coffeeBrown,
    primaryLight: '#A67C52',
    primaryDark: '#6B4428',
    accent: BookLoopColors.mutedGold,
    accentSecondary: BookLoopColors.burntOrange,

    // Glass Effect
    glass: BookLoopColors.glassLight,
    glassBorder: 'rgba(139, 94, 60, 0.2)',
    glassGold: BookLoopColors.glassGold,

    // UI Elements
    border: BookLoopColors.softLatte,
    divider: '#E8E3DE',
    shadow: 'rgba(44, 24, 16, 0.1)',

    // Icons & Tabs
    icon: BookLoopColors.warmGray,
    iconActive: BookLoopColors.coffeeBrown,
    tabIconDefault: BookLoopColors.warmGray,
    tabIconSelected: BookLoopColors.coffeeBrown,
    tint: BookLoopColors.coffeeBrown,

    // Badges
    verified: BookLoopColors.verifiedBadge,
    boosted: BookLoopColors.boostedListing,

    // Semantic
    success: BookLoopColors.success,
    warning: BookLoopColors.warning,
    error: BookLoopColors.error,
    info: BookLoopColors.info,
  },
  dark: {
    // Text
    text: BookLoopColors.cream,
    textSecondary: BookLoopColors.warmGray,
    textInverse: BookLoopColors.deepBrown,

    // Backgrounds
    background: '#1A1410',
    backgroundSecondary: BookLoopColors.deepBrown,
    surface: '#3D2E24',
    card: '#2C1F18',

    // Primary & Actions
    primary: BookLoopColors.burntOrange,
    primaryLight: '#E89A5D',
    primaryDark: '#B85E2D',
    accent: BookLoopColors.mutedGold,
    accentSecondary: BookLoopColors.coffeeBrown,

    // Glass Effect
    glass: BookLoopColors.glassDark,
    glassBorder: 'rgba(217, 121, 65, 0.3)',
    glassGold: BookLoopColors.glassGold,

    // UI Elements
    border: '#4A4238',
    divider: '#3D2E24',
    shadow: 'rgba(0, 0, 0, 0.5)',

    // Icons & Tabs
    icon: BookLoopColors.warmGray,
    iconActive: BookLoopColors.burntOrange,
    tabIconDefault: BookLoopColors.warmGray,
    tabIconSelected: BookLoopColors.burntOrange,
    tint: BookLoopColors.burntOrange,

    // Badges
    verified: BookLoopColors.verifiedBadge,
    boosted: BookLoopColors.boostedListing,

    // Semantic
    success: BookLoopColors.success,
    warning: BookLoopColors.warning,
    error: BookLoopColors.error,
    info: BookLoopColors.info,
  },
};

/**
 * Typography System
 *
 * Font Families:
 * - Poppins: Headings and emphasis
 * - Inter: Body text and UI
 * - Libre Baskerville: Quotes and literary content
 */
export const Typography = {
  // Font Families (will be loaded via expo-font)
  fontFamily: {
    heading: 'Poppins-SemiBold', // Warm, friendly headings
    body: 'Inter-Regular', // Clean, readable body text
    bodyBold: 'Inter-Bold',
    literary: 'LibreBaskerville-Regular', // For quotes, book descriptions
    mono: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },

  // Font Sizes (4px base unit)
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },

  // Font Weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

/**
 * Spacing System (4px base unit)
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

/**
 * Border Radius (for glassmorphic effect)
 */
export const BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

/**
 * Shadow Definitions (platform-specific)
 */
export const Shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    android: {
      elevation: 8,
    },
    default: {},
  }),
  xl: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
    },
    android: {
      elevation: 16,
    },
    default: {},
  }),
};

/**
 * Glassmorphism Effect Helper
 *
 * Creates the signature glass effect with backdrop blur.
 * Note: Backdrop blur requires react-native-blur or similar library.
 */
export const GlassEffect = {
  light: {
    backgroundColor: BookLoopColors.glassLight,
    borderWidth: 1,
    borderColor: 'rgba(139, 94, 60, 0.2)',
    // Blur will be applied via BlurView component
  },
  dark: {
    backgroundColor: BookLoopColors.glassDark,
    borderWidth: 1,
    borderColor: 'rgba(217, 121, 65, 0.3)',
    // Blur will be applied via BlurView component
  },
};

/**
 * Animation Durations (in milliseconds)
 */
export const AnimationDuration = {
  fast: 150,
  normal: 300,
  slow: 500,
};

/**
 * Z-Index Layers
 */
export const ZIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
};
