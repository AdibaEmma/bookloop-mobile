import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BookLoopColors } from '@/constants/theme';

/**
 * FilterChips
 *
 * Horizontal filter row from the home design (3a/3b). The active chip is a
 * solid coffee-brown pill; inactive chips are translucent with a warm border.
 * The "Near me" chip carries a leading map-pin icon.
 */

export interface FilterChip {
  key: string;
  label: string;
  icon?: 'near';
}

interface Props {
  chips: FilterChip[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function FilterChips({ chips, activeKey, onChange }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const isDark = scheme === 'dark';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {chips.map((chip) => {
        const active = chip.key === activeKey;
        const activeBg = isDark ? BookLoopColors.burntOrange : BookLoopColors.coffeeBrown;
        const idleBg = isDark ? BookLoopColors.darkSurfaceRaised : 'rgba(255,255,255,0.7)';
        const idleFg = isDark ? '#C9B79C' : '#6B5240';
        const idleBorder = isDark ? BookLoopColors.darkBorderSoft : 'rgba(139,94,60,0.14)';
        const fg = active ? '#FFF8F0' : idleFg;
        return (
          <TouchableOpacity
            key={chip.key}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(chip.key);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.chip,
              {
                backgroundColor: active ? activeBg : idleBg,
                borderColor: active ? activeBg : idleBorder,
              },
              active && !isDark && styles.activeShadow,
            ]}
          >
            {chip.icon === 'near' && <MapPin size={13} color={fg} strokeWidth={2.2} />}
            <Text style={[styles.label, { color: fg }]}>{chip.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
  },
  activeShadow: {
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    fontWeight: '600',
  },
});
