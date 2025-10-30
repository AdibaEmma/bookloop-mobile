import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from './GlassCard';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
} from '@/constants/theme';

/**
 * BookCard Component
 *
 * Displays a book listing with cover, title, author, and metadata.
 *
 * Features:
 * - Book cover image
 * - Title and author
 * - Book condition badge
 * - Distance indicator
 * - Listing type (exchange/donate/borrow)
 * - Tap to view details
 */

interface BookCardProps {
  title: string;
  author: string;
  coverImage?: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  listingType: 'exchange' | 'donate' | 'borrow';
  distance?: number; // in meters
  onPress: () => void;
}

export function BookCard({
  title,
  author,
  coverImage,
  condition,
  listingType,
  distance,
  onPress,
}: BookCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const conditionLabels = {
    new: 'New',
    like_new: 'Like New',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
  };

  const conditionColors = {
    new: colors.success,
    like_new: colors.success,
    good: colors.info,
    fair: colors.warning,
    poor: colors.error,
  };

  const listingTypeIcons: Record<string, any> = {
    exchange: 'swap-horizontal',
    donate: 'gift',
    borrow: 'time',
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <GlassCard variant="md" padding="md" shadow="md">
        <View style={styles.container}>
          {/* Book Cover */}
          <View style={styles.coverContainer}>
            {coverImage ? (
              <Image
                source={{ uri: coverImage }}
                style={styles.cover}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.coverPlaceholder, { backgroundColor: colors.surface }]}>
                <Ionicons name="book" size={32} color={colors.textSecondary} />
              </View>
            )}
          </View>

          {/* Book Info */}
          <View style={styles.info}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={2}
            >
              {title}
            </Text>
            <Text
              style={[styles.author, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {author}
            </Text>

            {/* Metadata */}
            <View style={styles.metadata}>
              {/* Condition Badge */}
              <View
                style={[
                  styles.badge,
                  { backgroundColor: `${conditionColors[condition]}20` },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: conditionColors[condition] },
                  ]}
                >
                  {conditionLabels[condition]}
                </Text>
              </View>

              {/* Listing Type */}
              <View style={styles.typeContainer}>
                <Ionicons
                  name={listingTypeIcons[listingType]}
                  size={14}
                  color={colors.primary}
                />
                <Text
                  style={[styles.typeText, { color: colors.primary }]}
                >
                  {listingType}
                </Text>
              </View>

              {/* Distance */}
              {distance !== undefined && (
                <View style={styles.distanceContainer}>
                  <Ionicons
                    name="location"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.distanceText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {formatDistance(distance)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  coverContainer: {
    marginRight: Spacing.md,
  },
  cover: {
    width: 80,
    height: 120,
    borderRadius: BorderRadius.md,
  },
  coverPlaceholder: {
    width: 80,
    height: 120,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  author: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.sm,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeText: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'capitalize',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  distanceText: {
    fontSize: Typography.fontSize.xs,
  },
});
