import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
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
} from '@/constants/theme';

/**
 * GlassSearchBar Component
 *
 * Glassmorphic search input with icon.
 *
 * Features:
 * - Search icon
 * - Clear button (when text present)
 * - Filter button (optional)
 * - Backdrop blur
 */

interface GlassSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  showFilter?: boolean;
}

export function GlassSearchBar({
  value,
  onChangeText,
  placeholder = 'Search books...',
  onFilterPress,
  showFilter = false,
}: GlassSearchBarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const glassStyle = GlassEffect[colorScheme];

  const useBlur = Platform.OS === 'ios' || Platform.OS === 'android';
  const Container = useBlur ? BlurView : View;
  const containerProps = useBlur
    ? { intensity: 20, tint: colorScheme }
    : { style: { backgroundColor: glassStyle.backgroundColor } };

  return (
    <Container
      {...containerProps}
      style={[
        styles.container,
        {
          borderColor: glassStyle.borderColor,
          borderWidth: glassStyle.borderWidth,
        },
      ]}
    >
      {/* Search Icon */}
      <Ionicons
        name="search"
        size={20}
        color={colors.textSecondary}
        style={styles.searchIcon}
      />

      {/* Input */}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { color: colors.text }]}
        returnKeyType="search"
      />

      {/* Clear Button */}
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} style={styles.iconButton}>
          <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* Filter Button */}
      {showFilter && (
        <TouchableOpacity onPress={onFilterPress} style={styles.iconButton}>
          <Ionicons name="filter" size={20} color={colors.primary} />
        </TouchableOpacity>
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    paddingVertical: Spacing.xs,
  },
  iconButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
});
