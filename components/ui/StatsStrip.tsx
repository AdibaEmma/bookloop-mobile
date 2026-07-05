import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Award, MapPin, Repeat, BookOpen } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BookLoopColors } from '@/constants/theme';

/**
 * StatsStrip
 *
 * The slim, calm dashboard strip from the home design (3a/3b) — one row of
 * Karma / Nearby / Swaps replacing the old rainbow stat tiles. Each cell is
 * tappable and routes somewhere meaningful.
 *
 * Kept intentionally cheap to render (no backdrop blur) for low-end Android.
 */

export interface StatItem {
  value: number | string;
  label: string;
  icon: 'karma' | 'nearby' | 'swaps' | 'listed';
  onPress?: () => void;
}

const ICONS = { karma: Award, nearby: MapPin, swaps: Repeat, listed: BookOpen } as const;

// Per-stat warm tints so the strip reads as designed even when the numbers are
// all zero. Translucent, so they sit correctly on both light and dark surfaces.
const TINTS = {
  karma: { bg: 'rgba(245,185,66,0.20)', fg: '#B98319' },
  nearby: { bg: 'rgba(139,94,60,0.13)', fg: BookLoopColors.coffeeBrown },
  swaps: { bg: 'rgba(217,121,65,0.16)', fg: BookLoopColors.burntOrange },
  listed: { bg: 'rgba(139,94,60,0.13)', fg: BookLoopColors.coffeeBrown },
} as const;

export function StatsStrip({ stats }: { stats: StatItem[] }) {
  const scheme = useColorScheme() ?? 'light';
  const isDark = scheme === 'dark';

  const c = isDark
    ? {
        bg: BookLoopColors.darkSurface,
        border: BookLoopColors.darkBorder,
        divider: BookLoopColors.darkBorder,
        value: BookLoopColors.darkText,
        label: BookLoopColors.darkTextMuted,
      }
    : {
        bg: 'rgba(255,255,255,0.72)',
        border: 'rgba(139,94,60,0.14)',
        divider: 'rgba(139,94,60,0.10)',
        value: BookLoopColors.deepEspresso,
        label: BookLoopColors.mutedText,
      };

  return (
    <View
      style={[
        styles.strip,
        { backgroundColor: c.bg, borderColor: c.border },
        !isDark && styles.lightShadow,
      ]}
    >
      {stats.map((s, i) => {
        const Icon = ICONS[s.icon];
        const tint = TINTS[s.icon];
        return (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={[styles.divider, { backgroundColor: c.divider }]} />}
            <TouchableOpacity
              style={styles.cell}
              activeOpacity={s.onPress ? 0.7 : 1}
              disabled={!s.onPress}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                s.onPress?.();
              }}
              accessibilityRole="button"
              accessibilityLabel={`${s.value} ${s.label}`}
            >
              <View style={[styles.chip, { backgroundColor: tint.bg }]}>
                <Icon size={17} color={tint.fg} strokeWidth={2} />
              </View>
              <Text style={[styles.value, { color: c.value }]}>{s.value}</Text>
              <Text style={[styles.label, { color: c.label }]}>{s.label}</Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  lightShadow: {
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 4,
  },
  divider: {
    width: 1,
    marginVertical: 16,
  },
  chip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    fontFamily: 'Inter-Regular',
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 1,
  },
});
