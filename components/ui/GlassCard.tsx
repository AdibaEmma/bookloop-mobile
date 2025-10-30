import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  BorderRadius,
  Spacing,
  Shadows,
  GlassEffect,
} from '@/constants/theme';

/**
 * GlassCard Component
 *
 * A glassmorphic card with backdrop blur effect.
 * Core building block for BookLoop's design system.
 *
 * Features:
 * - Backdrop blur (iOS/Android)
 * - Customizable border radius
 * - Shadow elevation
 * - Padding variants
 * - Responsive to theme (light/dark)
 *
 * Usage:
 * ```tsx
 * <GlassCard variant="md" padding="lg">
 *   <Text>Content here</Text>
 * </GlassCard>
 * ```
 */

interface GlassCardProps {
  children: React.ReactNode;
  variant?: 'sm' | 'md' | 'lg' | 'xl';
  padding?: keyof typeof Spacing;
  style?: StyleProp<ViewStyle>;
  blurIntensity?: number;
  shadow?: keyof typeof Shadows;
}

export function GlassCard({
  children,
  variant = 'md',
  padding = 'md',
  style,
  blurIntensity = 20,
  shadow = 'md',
}: GlassCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const glassStyle = GlassEffect[colorScheme];

  const borderRadiusValue = {
    sm: BorderRadius.md,
    md: BorderRadius.lg,
    lg: BorderRadius.xl,
    xl: BorderRadius['2xl'],
  }[variant];

  // On platforms that support blur, use BlurView
  // Otherwise, fall back to semi-transparent background
  const useBlur = Platform.OS === 'ios' || Platform.OS === 'android';

  if (useBlur) {
    return (
      <BlurView
        intensity={blurIntensity}
        tint={colorScheme}
        style={[
          styles.card,
          {
            borderRadius: borderRadiusValue,
            padding: Spacing[padding],
            borderWidth: glassStyle.borderWidth,
            borderColor: glassStyle.borderColor,
          },
          Shadows[shadow],
          style,
        ]}
      >
        {children}
      </BlurView>
    );
  }

  // Fallback for web or unsupported platforms
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: glassStyle.backgroundColor,
          borderRadius: borderRadiusValue,
          padding: Spacing[padding],
          borderWidth: glassStyle.borderWidth,
          borderColor: glassStyle.borderColor,
        },
        Shadows[shadow],
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
