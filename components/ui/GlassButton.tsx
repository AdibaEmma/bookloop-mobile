import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  BorderRadius,
  Spacing,
  Shadows,
  AnimationDuration,
} from '@/constants/theme';

/**
 * GlassButton Component
 *
 * Glassmorphic button with haptic feedback.
 *
 * Variants:
 * - primary: Solid primary color (main CTAs)
 * - secondary: Outlined with glass effect
 * - ghost: Minimal, transparent
 *
 * Sizes:
 * - sm: Small buttons (32px height)
 * - md: Medium buttons (44px height) - default
 * - lg: Large buttons (56px height)
 *
 * Features:
 * - Haptic feedback on press
 * - Loading state with spinner
 * - Disabled state
 * - Icon support (left/right)
 */

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function GlassButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  fullWidth = false,
}: GlassButtonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const handlePress = () => {
    if (disabled || loading) return;

    // Haptic feedback
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onPress();
  };

  const buttonHeight = {
    sm: 32,
    md: 44,
    lg: 56,
  }[size];

  const fontSize = {
    sm: Typography.fontSize.sm,
    md: Typography.fontSize.base,
    lg: Typography.fontSize.lg,
  }[size];

  const paddingHorizontal = {
    sm: Spacing.md,
    md: Spacing.lg,
    lg: Spacing.xl,
  }[size];

  // Variant styles
  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: colors.primary,
            borderWidth: 0,
          },
          text: {
            color: colors.textInverse,
            fontWeight: Typography.fontWeight.semibold,
          },
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: colors.glass,
            borderWidth: 1,
            borderColor: colors.glassBorder,
          },
          text: {
            color: colors.text,
            fontWeight: Typography.fontWeight.medium,
          },
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 0,
          },
          text: {
            color: colors.primary,
            fontWeight: Typography.fontWeight.medium,
          },
        };
    }
  };

  const variantStyles = getVariantStyles();

  const containerStyle: ViewStyle = {
    height: buttonHeight,
    paddingHorizontal,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.5 : 1,
    ...(fullWidth && { width: '100%' }),
    ...variantStyles.container,
    ...(variant !== 'ghost' && Shadows.md),
  };

  const textStyle: TextStyle = {
    fontSize,
    ...variantStyles.text,
  };

  return (
    <TouchableOpacity
      style={[containerStyle, style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.text.color} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Text style={[styles.icon, { marginRight: Spacing.sm }]}>
              {icon}
            </Text>
          )}
          <Text style={textStyle}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <Text style={[styles.icon, { marginLeft: Spacing.sm }]}>
              {icon}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
