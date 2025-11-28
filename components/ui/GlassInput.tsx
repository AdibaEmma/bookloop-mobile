import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  BorderRadius,
  Spacing,
  GlassEffect,
  BookLoopColors,
} from '@/constants/theme';

/**
 * GlassInput Component
 *
 * Glassmorphic text input with label and error support.
 *
 * Features:
 * - Floating label
 * - Error state with message
 * - Secure text entry (password)
 * - Multiline support
 * - Icon support
 * - Character counter
 */

interface GlassInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  disabled?: boolean;
  showCharCount?: boolean;
  style?: ViewStyle;
}

export function GlassInput({
  label,
  value,
  onChangeText,
  onBlur,
  onSubmitEditing,
  placeholder,
  error,
  secureTextEntry = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  returnKeyType,
  leftIcon,
  rightIcon,
  onRightIconPress,
  disabled = false,
  showCharCount = false,
  style,
}: GlassInputProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const glassStyle = GlassEffect[colorScheme];
  const [isFocused, setIsFocused] = useState(false);

  const useBlur = Platform.OS === 'ios' || Platform.OS === 'android';

  const containerStyle: ViewStyle = {
    borderRadius: BorderRadius.lg,
    borderWidth: glassStyle.borderWidth,
    borderColor: error
      ? colors.error
      : isFocused
        ? colors.primary
        : glassStyle.borderColor,
    minHeight: multiline ? 100 : 50,
  };

  const inputContainerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: multiline ? 'flex-start' : 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  };

  const inputStyle: TextStyle = {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: colors.text,
    paddingVertical: Spacing.sm,
    ...(multiline && {
      textAlignVertical: 'top',
      minHeight: 80,
    }),
  };

  const InputContainer = useBlur ? BlurView : View;
  const blurProps = useBlur
    ? {
        intensity: 20,
        tint: colorScheme,
      }
    : {
        style: { backgroundColor: glassStyle.backgroundColor },
      };

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      )}

      <InputContainer {...blurProps} style={[containerStyle, styles.container]}>
        <View style={inputContainerStyle}>
          {leftIcon && (
            <View style={styles.iconLeft}>
              <Ionicons name={leftIcon} size={20} color={colors.textSecondary} />
            </View>
          )}

          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry={secureTextEntry}
            multiline={multiline}
            numberOfLines={numberOfLines}
            maxLength={maxLength}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            editable={!disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              onBlur?.();
            }}
            style={inputStyle}
          />

          {rightIcon && (
            <TouchableOpacity
              onPress={onRightIconPress}
              style={styles.iconRight}
              disabled={!onRightIconPress}
            >
              <Ionicons name={rightIcon} size={20} color={BookLoopColors.burntOrange} />
            </TouchableOpacity>
          )}
        </View>
      </InputContainer>

      {/* Error or Character Count */}
      <View style={styles.footer}>
        {error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}
        {showCharCount && maxLength && (
          <Text style={[styles.charCount, { color: colors.textSecondary }]}>
            {value.length}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.sm,
  },
  container: {
    overflow: 'hidden',
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.xs,
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  errorText: {
    fontSize: Typography.fontSize.xs,
  },
  charCount: {
    fontSize: Typography.fontSize.xs,
  },
});
