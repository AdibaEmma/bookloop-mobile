import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Heart, ArrowLeftRight, Zap, ShieldCheck } from 'lucide-react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  BookLoopColors,
  ConditionBadge,
  Spacing,
} from '@/constants/theme';

/**
 * BookCard
 *
 * Book listing card, restyled to the design refresh (3a/3b):
 * - spine-textured cover (falls back to the real cover image when present)
 * - color-coded condition badge, "Exchange" chip, beige distance chip
 * - "Wants:" preference line with priority numbering
 * - owner row with verified shield
 * - boosted variant: gold border + floating BOOSTED ribbon + warm glow
 *
 * Theme-aware (light 3a / dark 3b). Kept flat and cheap for low-end Android.
 */

type Condition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';

interface ExchangePreference {
  id: string;
  book: { id: string; title: string; author?: string };
  priority: number;
}

interface Owner {
  name: string;
  initials?: string;
  avatarUrl?: string;
  verified?: boolean;
}

interface BookCardProps {
  title: string;
  author: string;
  coverImage?: string;
  condition: Condition;
  listingType: 'exchange' | 'donate' | 'borrow';
  distance?: number; // meters
  onPress: () => void;
  boosted?: boolean;
  favorited?: boolean;
  onToggleFavorite?: () => void;
  exchangePreferences?: ExchangePreference[];
  owner?: Owner;
  isOwnListing?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Deterministic warm spine tint from the title, so placeholder covers vary.
const SPINE_LIGHT = [
  ['#C9A97E', '#BE9A6B'],
  ['#B98A6B', '#AC7C5E'],
  ['#BFA47C', '#B2946A'],
  ['#C2A17A', '#B58F66'],
];
const SPINE_DARK = [
  ['#4A3B2C', '#3E3124'],
  ['#453626', '#3A2D20'],
  ['#4E3E2E', '#42342572'],
  ['#463724', '#3B2E1F'],
];

function spineFor(title: string, isDark: boolean): [string, string] {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) % 997;
  const set = isDark ? SPINE_DARK : SPINE_LIGHT;
  return set[h % set.length] as [string, string];
}

const listingTypeLabel: Record<string, string> = {
  exchange: 'Exchange',
  donate: 'Donate',
  borrow: 'Borrow',
};

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function BookCard({
  title,
  author,
  coverImage,
  condition,
  listingType,
  distance,
  onPress,
  boosted = false,
  favorited = false,
  onToggleFavorite,
  exchangePreferences,
  owner,
  isOwnListing = false,
  style,
}: BookCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const isDark = scheme === 'dark';

  const cond = ConditionBadge[condition] ?? ConditionBadge.good;
  const condColors = isDark ? cond.dark : cond.light;
  const [spineA, spineB] = spineFor(title, isDark);

  const c = isDark
    ? {
        card: BookLoopColors.darkSurface,
        border: BookLoopColors.darkBorder,
        title: BookLoopColors.darkText,
        author: BookLoopColors.darkTextMuted,
        meta: BookLoopColors.darkTextMuted,
        wantsHi: BookLoopColors.darkText,
        distBg: BookLoopColors.darkBgDeep,
        distFg: '#C9B79C',
        heart: '#6B5844',
        exchange: '#E89A5D',
        ownerAvatar: '#4A3B2C',
        ownerName: '#F2E9DE',
        spineText: '#E4D4C0',
      }
    : {
        card: '#FFFFFF',
        border: '#EFE2CE',
        title: BookLoopColors.deepEspresso,
        author: BookLoopColors.authorText,
        meta: BookLoopColors.authorText,
        wantsHi: BookLoopColors.deepEspresso,
        distBg: BookLoopColors.parchmentBeige,
        distFg: '#6B5240',
        heart: '#C9B79C',
        exchange: BookLoopColors.coffeeBrown,
        ownerAvatar: BookLoopColors.softLatte,
        ownerName: BookLoopColors.deepEspresso,
        spineText: '#3d2c1e',
      };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${title} by ${author}`}
      style={[
        styles.card,
        {
          backgroundColor: c.card,
          borderColor: boosted ? BookLoopColors.mutedGold : c.border,
          borderWidth: boosted ? 1.5 : 1,
        },
        boosted && styles.boostedGlow,
        style,
      ]}
    >
      {boosted && (
        <View style={styles.boostedRibbon}>
          <Zap size={10} color="#5A3E1E" fill="#5A3E1E" strokeWidth={0} />
          <Text style={styles.boostedText}>BOOSTED</Text>
        </View>
      )}

      {/* Cover */}
      {coverImage ? (
        <Image source={{ uri: coverImage }} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.cover, styles.coverSpine, { backgroundColor: spineA, borderColor: spineB }]}>
          <Text style={[styles.spineText, { color: c.spineText }]} numberOfLines={3}>
            {title}
          </Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <View style={styles.titleWrap}>
            <Text style={[styles.title, { color: c.title }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={[styles.author, { color: c.author }]} numberOfLines={1}>
              {author}
            </Text>
          </View>
          {!isOwnListing && (
            <TouchableOpacity
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation();
                onToggleFavorite?.();
              }}
              accessibilityRole="button"
              accessibilityLabel={favorited ? 'Remove from saved' : 'Save book'}
            >
              <Heart
                size={20}
                color={favorited ? BookLoopColors.error : c.heart}
                fill={favorited ? BookLoopColors.error : 'transparent'}
                strokeWidth={1.8}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Meta chips */}
        <View style={styles.metaRow}>
          <View style={[styles.condBadge, { backgroundColor: condColors.bg }]}>
            <Text style={[styles.condText, { color: condColors.fg }]}>{cond.label}</Text>
          </View>
          <View style={styles.typeChip}>
            <ArrowLeftRight size={12} color={c.exchange} strokeWidth={2} />
            <Text style={[styles.typeText, { color: c.exchange }]}>
              {listingTypeLabel[listingType]}
            </Text>
          </View>
          {distance !== undefined && (
            <View style={[styles.distChip, { backgroundColor: c.distBg }]}>
              <Text style={[styles.distText, { color: c.distFg }]}>{formatDistance(distance)}</Text>
            </View>
          )}
        </View>

        {/* Wants line */}
        {listingType === 'exchange' && exchangePreferences && exchangePreferences.length > 0 && (
          <Text style={[styles.wants, { color: c.meta }]} numberOfLines={1}>
            Wants:{' '}
            <Text style={[styles.wantsHi, { color: c.wantsHi }]}>
              1. {exchangePreferences[0].book.title}
              {exchangePreferences.length > 1 ? ` +${exchangePreferences.length - 1}` : ''}
            </Text>
          </Text>
        )}

        {/* Owner */}
        {owner && (
          <View style={styles.ownerRow}>
            {owner.avatarUrl ? (
              <Image source={{ uri: owner.avatarUrl }} style={styles.ownerAvatar} />
            ) : (
              <View style={[styles.ownerAvatar, { backgroundColor: c.ownerAvatar }]}>
                <Text style={styles.ownerInitials}>
                  {owner.initials ?? owner.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={[styles.ownerName, { color: c.ownerName }]} numberOfLines={1}>
              {owner.name}
            </Text>
            {owner.verified && (
              <ShieldCheck size={14} color={BookLoopColors.coffeeBrown} fill={BookLoopColors.mutedGold} strokeWidth={1.4} />
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 13,
    borderRadius: 16,
    position: 'relative',
  },
  boostedGlow: {
    shadowColor: '#FFB43C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 4,
  },
  boostedRibbon: {
    position: 'absolute',
    top: -9,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 9,
    backgroundColor: BookLoopColors.mutedGold,
    zIndex: 2,
  },
  boostedText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: '#5A3E1E',
  },
  cover: {
    width: 64,
    height: 92,
    borderRadius: 8,
  },
  coverSpine: {
    borderLeftWidth: 6,
    justifyContent: 'flex-end',
    padding: 7,
    overflow: 'hidden',
  },
  spineText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    fontWeight: '600',
    lineHeight: 11,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 14.5,
    fontWeight: '700',
    lineHeight: 18,
  },
  author: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  condBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  condText: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    fontWeight: '600',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  typeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    fontWeight: '600',
  },
  distChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  distText: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    fontWeight: '600',
  },
  wants: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 8,
  },
  wantsHi: {
    fontWeight: '600',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  ownerAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerInitials: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    fontWeight: '700',
    color: BookLoopColors.deepEspresso,
  },
  ownerName: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
});
