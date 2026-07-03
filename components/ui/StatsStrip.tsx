import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Award, MapPin, Repeat } from 'lucide-react-native';
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
  icon: 'karma' | 'nearby' | 'swaps';
  onPress?: () => void;
}

const ICONS = { karma: Award, nearby: MapPin, swaps: Repeat } as const;

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
        icon: BookLoopColors.burntOrange,
      }
    : {
        bg: 'rgba(255,255,255,0.65)',
        border: 'rgba(139,94,60,0.14)',
        divider: 'rgba(139,94,60,0.12)',
        value: BookLoopColors.deepEspresso,
        label: BookLoopColors.mutedText,
        icon: BookLoopColors.coffeeBrown,
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
              <Text style={[styles.value, { color: c.value }]}>{s.value}</Text>
              <View style={styles.labelRow}>
                <Icon size={12} color={c.icon} strokeWidth={2} />
                <Text style={[styles.label, { color: c.label }]}>{s.label}</Text>
              </View>
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
    gap: 3,
    paddingVertical: 11,
    paddingHorizontal: 4,
    minHeight: 44,
  },
  divider: {
    width: 1,
    marginVertical: 9,
  },
  value: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 17,
    fontWeight: '700',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    fontWeight: '600',
  },
});
