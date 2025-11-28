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

interface ExchangePreference {
  id: string;
  bookId: string;
  book: {
    id: string;
    title: string;
    author: string;
    coverImage?: string;
  };
  priority: number;
}

interface BookCardProps {
  title: string;
  author: string;
  coverImage?: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  listingType: 'exchange' | 'donate' | 'borrow';
  distance?: number; // in meters
  onPress: () => void;
  onTypePress?: () => void; // Optional callback for listing type interaction
  variant?: 'default' | 'compact'; // Size variant
  exchangePreferences?: ExchangePreference[]; // Books wanted in exchange
  onInitiateExchange?: () => void; // Callback when user wants to initiate exchange
  isOwnListing?: boolean; // Whether this listing belongs to current user
}

export function BookCard({
  title,
  author,
  coverImage,
  condition,
  listingType,
  distance,
  onPress,
  onTypePress,
  variant = 'default',
  exchangePreferences,
  onInitiateExchange,
  isOwnListing = false,
}: BookCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Determine dimensions based on variant
  const coverWidth = variant === 'compact' ? 60 : 80;
  const coverHeight = variant === 'compact' ? 90 : 120;
  const iconSize = variant === 'compact' ? 24 : 32;

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
                style={[styles.cover, { width: coverWidth, height: coverHeight }]}
                resizeMode="cover"
              />
            ) : (
              <View style={[
                styles.coverPlaceholder,
                {
                  backgroundColor: colors.surface,
                  width: coverWidth,
                  height: coverHeight
                }
              ]}>
                <Ionicons name="book" size={iconSize} color={colors.textSecondary} />
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
              {onTypePress ? (
                <TouchableOpacity
                  style={styles.typeContainer}
                  onPress={onTypePress}
                  activeOpacity={0.7}
                >
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
                </TouchableOpacity>
              ) : (
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
              )}

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

            {/* Exchange Preferences (only for exchange type listings) */}
            {listingType === 'exchange' && exchangePreferences && exchangePreferences.length > 0 && (
              <View style={styles.preferencesContainer}>
                <Text style={[styles.preferencesLabel, { color: colors.textSecondary }]}>
                  Wants in exchange:
                </Text>
                <View style={styles.preferencesList}>
                  {exchangePreferences.slice(0, 2).map((pref, index) => (
                    <View key={pref.id} style={styles.preferenceChip}>
                      <Text style={[styles.preferenceNumber, { color: colors.primary }]}>
                        {pref.priority}.
                      </Text>
                      <Text style={[styles.preferenceTitle, { color: colors.text }]} numberOfLines={1}>
                        {pref.book.title}
                      </Text>
                    </View>
                  ))}
                  {exchangePreferences.length > 2 && (
                    <Text style={[styles.moreText, { color: colors.textSecondary }]}>
                      +{exchangePreferences.length - 2} more
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Initiate Exchange Button (for exchange type, not own listing) */}
            {listingType === 'exchange' && !isOwnListing && onInitiateExchange && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onInitiateExchange();
                }}
                style={styles.initiateButton}
                activeOpacity={0.7}
              >
                <Ionicons name="swap-horizontal" size={16} color="#FFFFFF" />
                <Text style={styles.initiateButtonText}>Initiate Exchange</Text>
              </TouchableOpacity>
            )}
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
    borderRadius: BorderRadius.md,
  },
  coverPlaceholder: {
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
  preferencesContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  preferencesLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: Spacing.xs / 2,
  },
  preferencesList: {
    gap: Spacing.xs / 2,
  },
  preferenceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  preferenceNumber: {
    fontSize: 11,
    fontWeight: '700',
  },
  preferenceTitle: {
    fontSize: 11,
    flex: 1,
  },
  moreText: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
  initiateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: '#E86B3E', // BookLoopColors.burntOrange
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  initiateButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
