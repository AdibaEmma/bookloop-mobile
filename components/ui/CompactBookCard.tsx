import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { PressableScale } from './motion';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BookCover } from './BookCover';
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

/** Columns the explore grid renders — the card sizes itself to match. */
export const COMPACT_CARD_COLUMNS = 3;

const CARD_GAP = Spacing.sm;
const CARD_HORIZONTAL_PADDING = Spacing.lg * 2;
// Floored so rounding can never push the last card of a row past the
// container edge and wrap it early.
const CARD_WIDTH = Math.floor(
  (SCREEN_WIDTH - CARD_HORIZONTAL_PADDING - CARD_GAP * (COMPACT_CARD_COLUMNS - 1)) /
    COMPACT_CARD_COLUMNS,
);
// Cover sits inside the card's padding; slightly squatter than 2:3 keeps the
// card compact while the text block below stays attached to its cover.
const CARD_PADDING = 6;
const COVER_WIDTH = CARD_WIDTH - CARD_PADDING * 2;
const COVER_HEIGHT = Math.round(COVER_WIDTH * 1.35);
// Fixed text-block height so all cards match:
// top padding (4) + 2-line title (30) + margin (1) + author line (13).
const TITLE_LINE_HEIGHT = 15;
const INFO_HEIGHT = 48;

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
    <PressableScale
      onPress={onPress}
      style={[styles.container, { width: CARD_WIDTH, backgroundColor: colors.card }]}
    >
      {/* Cover Image Container */}
      <View style={styles.coverContainer}>
        <BookCover title={title} author={author} coverImage={coverImage} size="md" fill />

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
            size={11}
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
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // One card surface holding cover + title + author, so the text reads as
  // part of the book instead of floating under it.
  container: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: CARD_PADDING,
    ...Shadows.sm,
  },
  coverContainer: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
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
    width: 20,
    height: 20,
    borderRadius: 10,
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
    fontSize: 8,
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
  // Fixed-height block keeps all cards equal; the author line follows the
  // title directly (no reserved blank line), so short titles leave any spare
  // space at the bottom instead of a gap mid-card.
  info: {
    height: INFO_HEIGHT,
    paddingTop: Spacing.xs,
    paddingHorizontal: 2,
  },
  title: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: TITLE_LINE_HEIGHT,
    marginBottom: 1,
  },
  author: {
    fontSize: 10,
    lineHeight: 13,
  },
});
