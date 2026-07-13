/**
 * ShelfDock — the app's bottom navigation.
 *
 * A floating warm dock instead of an edge-to-edge system bar: inset from the
 * screen edges with soft elevation, the active tab sits on a gold-tinted
 * pill, and the centre "+" (list a book) stays the one bold element. Renders
 * in normal layout flow (not absolute) so screens keep their content space.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Home, Compass, Plus, Repeat, User } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { usePalette } from '@/hooks/usePalette';
import { BookLoopColors } from '@/constants/theme';

type IconType = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}>;

const TABS: Record<string, { label: string; Icon: IconType }> = {
  index: { label: 'Home', Icon: Home },
  explore: { label: 'Explore', Icon: Compass },
  exchanges: { label: 'Swaps', Icon: Repeat },
  profile: { label: 'Profile', Icon: User },
};

export function ShelfDock({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const p = usePalette();

  const go = (routeName: string, isFocused: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (routeName === 'listings') {
      // The centre "+" is an action, not a tab — it opens create-listing.
      router.push('/listing/create');
      return;
    }
    if (!isFocused) {
      navigation.navigate(routeName as never);
    }
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View
        style={[
          styles.dock,
          { backgroundColor: p.surfaceRaised, borderColor: p.borderSoft },
        ]}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          if (route.name === 'listings') {
            return (
              <Pressable
                key={route.key}
                onPress={() => go(route.name, isFocused)}
                style={styles.fabSlot}
                hitSlop={{ top: 16 }}
                accessibilityRole="button"
                accessibilityLabel="List a book"
              >
                <LinearGradient
                  colors={[BookLoopColors.mutedGold, BookLoopColors.goldDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.fab}
                >
                  <Plus size={24} color={BookLoopColors.deepEspresso} strokeWidth={2.4} />
                </LinearGradient>
              </Pressable>
            );
          }

          const tab = TABS[route.name];
          if (!tab) return null;
          const { label, Icon } = tab;
          const color = isFocused ? p.accent : p.textFaint;

          return (
            <Pressable
              key={route.key}
              onPress={() => go(route.name, isFocused)}
              style={styles.item}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={label}
            >
              <View style={styles.pill}>
                {isFocused && (
                  <Animated.View
                    entering={FadeIn.duration(180)}
                    style={[styles.pillBg, { backgroundColor: p.goldTint }]}
                  />
                )}
                <Icon
                  size={21}
                  color={color}
                  strokeWidth={isFocused ? 2.1 : 1.8}
                  fill={isFocused ? p.goldTint : 'transparent'}
                />
                <Text style={[styles.label, { color }]} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 14,
    paddingTop: 6,
    backgroundColor: 'transparent',
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 62,
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 6,
    shadowColor: '#2A1B0E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 58,
    overflow: 'hidden',
  },
  pillBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    fontWeight: '600',
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  fab: {
    width: 46,
    height: 46,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Platform.OS === 'ios' ? -14 : -12,
    shadowColor: BookLoopColors.goldDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
});
