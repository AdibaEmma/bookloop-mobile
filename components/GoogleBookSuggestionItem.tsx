import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
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
import type { GoogleBookResult } from '@/services/api/books.service';

interface GoogleBookSuggestionItemProps {
  book: GoogleBookResult;
  onPress: () => void;
  isLoading?: boolean;
  isSelected?: boolean;
  disabled?: boolean;
}

/**
 * GoogleBookSuggestionItem Component
 *
 * Displays a book suggestion from Google Books API.
 * Features:
 * - Book cover thumbnail (or placeholder)
 * - Title (truncated to 2 lines)
 * - Author + publication year
 * - Add/Selected state indicator
 * - Loading spinner when creating
 */
export function GoogleBookSuggestionItem({
  book,
  onPress,
  isLoading = false,
  isSelected = false,
  disabled = false,
}: GoogleBookSuggestionItemProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const glassStyle = GlassEffect[colorScheme];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isLoading || disabled || isSelected}
      style={[
        styles.container,
        {
          borderColor: isSelected ? BookLoopColors.burntOrange : glassStyle.borderColor,
          backgroundColor: isSelected ? `${BookLoopColors.burntOrange}10` : 'transparent',
          opacity: disabled && !isSelected ? 0.5 : 1,
        },
      ]}
      activeOpacity={0.7}
    >
      {/* Book Cover */}
      {book.coverImage ? (
        <Image source={{ uri: book.coverImage }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder, { backgroundColor: colors.surface }]}>
          <Ionicons name="book" size={24} color={colors.textSecondary} />
        </View>
      )}

      {/* Book Info */}
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={[styles.author, { color: colors.textSecondary }]} numberOfLines={1}>
          {book.author}
          {book.publishedYear ? ` (${book.publishedYear})` : ''}
        </Text>
      </View>

      {/* Action Indicator */}
      <View style={styles.action}>
        {isLoading ? (
          <ActivityIndicator size="small" color={BookLoopColors.burntOrange} />
        ) : isSelected ? (
          <Ionicons name="checkmark-circle" size={24} color={BookLoopColors.burntOrange} />
        ) : (
          <Ionicons
            name="add-circle-outline"
            size={24}
            color={disabled ? colors.textSecondary : BookLoopColors.burntOrange}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  cover: {
    width: 50,
    height: 75,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  author: {
    fontSize: Typography.fontSize.sm,
  },
  action: {
    marginLeft: Spacing.sm,
    width: 28,
    alignItems: 'center',
  },
});
