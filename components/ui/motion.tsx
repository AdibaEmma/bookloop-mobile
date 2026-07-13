/**
 * Motion primitives — the app's one vocabulary for movement.
 *
 * Two moves, used everywhere so the app feels alive but never busy:
 *  - Enter: content rises softly into place, lists stagger by index
 *  - Press: touchables give a small springy dip under the finger
 *
 * Usage:
 *   <Enter index={i}><Card … /></Enter>
 *   <PressableScale onPress={…}>…</PressableScale>
 */

import React, { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const STAGGER_MS = 45;
const MAX_STAGGER_STEPS = 12; // deep list items shouldn't wait seconds

/** Soft rise-in for content; pass `index` to stagger list items. */
export function Enter({
  children,
  index = 0,
  style,
}: {
  children: ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const delay = Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS;
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(18).stiffness(160).reduceMotion(ReduceMotion.System)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/** Plain fade for chrome (headers, pills) where rising would feel like motion for its own sake. */
export function Appear({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View entering={FadeIn.delay(delay).duration(260).reduceMotion(ReduceMotion.System)} style={style}>
      {children}
    </Animated.View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Pressable with a springy dip — the standard press feedback. */
export function PressableScale({
  children,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: PressableProps & { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        scale.value = withSpring(0.97, { damping: 20, stiffness: 300, reduceMotion: ReduceMotion.System });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 16, stiffness: 220, reduceMotion: ReduceMotion.System });
        onPressOut?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
