import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  BookLoopColors,
  Shadows,
} from '@/constants/theme';

/**
 * CompactBookCard Component
 *
 * A space-efficient card optimized for grid layouts.
 * Shows book cover prominently with minimal metadata overlay.
 */

interface CompactBookCardProps {
  title: string;
  author: string;
  coverImage?: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  listingType: 'exchange' | 'donate' | 'borrow';
  distance?: number;
  onPress: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = Spacing.sm;
const CARD_HORIZONTAL_PADDING = Spacing.lg * 2;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_HORIZONTAL_PADDING - CARD_GAP) / 2;
const COVER_HEIGHT = CARD_WIDTH * 1.4;

export function CompactBookCard({
  title,
  author,
  coverImage,
  condition,
  listingType,
  distance,
  onPress,
}: CompactBookCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const conditionColors: Record<string, string> = {
    new: colors.success,
    like_new: colors.success,
    good: colors.info,
    fair: colors.warning,
    poor: colors.error,
  };

  const conditionLabels: Record<string, string> = {
    new: 'New',
    like_new: 'Like New',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
  };

  const listingTypeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    exchange: 'swap-horizontal',
    donate: 'gift',
    borrow: 'time',
  };

  const listingTypeColors: Record<string, string> = {
    exchange: BookLoopColors.burntOrange,
    donate: BookLoopColors.success,
    borrow: BookLoopColors.info,
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.container, { width: CARD_WIDTH }]}
    >
      {/* Cover Image Container */}
      <View style={styles.coverContainer}>
        {coverImage ? (
          <Image
            source={{ uri: coverImage }}
            style={styles.cover}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.coverPlaceholder, { backgroundColor: colors.surface }]}>
            <Ionicons name="book" size={40} color={colors.textSecondary} />
          </View>
        )}

        {/* Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.gradient}
        />

        {/* Listing Type Badge */}
        <View
          style={[
            styles.typeBadge,
            { backgroundColor: listingTypeColors[listingType] },
          ]}
        >
          <Ionicons
            name={listingTypeIcons[listingType]}
            size={12}
            color="#FFFFFF"
          />
        </View>

        {/* Condition Badge */}
        <View
          style={[
            styles.conditionBadge,
            { backgroundColor: `${conditionColors[condition]}` },
          ]}
        >
          <Text style={styles.conditionText}>{conditionLabels[condition]}</Text>
        </View>

        {/* Distance Badge */}
        {distance !== undefined && (
          <View style={styles.distanceBadge}>
            <Ionicons name="location" size={10} color="#FFFFFF" />
            <Text style={styles.distanceText}>{formatDistance(distance)}</Text>
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
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  coverContainer: {
    width: '100%',
    height: COVER_HEIGHT,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    ...Shadows.md,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  typeBadge: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conditionBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  conditionText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  distanceBadge: {
    position: 'absolute',
    bottom: Spacing.xs,
    left: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  info: {
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: 18,
    marginBottom: 2,
  },
  author: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
  },
});
