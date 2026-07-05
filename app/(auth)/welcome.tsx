/**
 * Welcome Screen — the story of BookLoop
 *
 * First screen for unauthenticated users. The hero is "the loop": a slow orbit
 * of book-spines circling a central book — the app's core idea (a book passing
 * from one reader to the next nearby) made visible. Below it, a literary hook
 * and the three concrete beats of the loop: List → Match → Swap.
 *
 * Navigation is unchanged: Get Started → phone-input, secondary → login.
 * Motion respects the OS "reduce motion" setting.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useReducedMotion,
  interpolate,
} from 'react-native-reanimated';
import {
  BookOpen,
  BookPlus,
  MapPin,
  ArrowLeftRight,
  ArrowRight,
} from 'lucide-react-native';
import { BookLoopColors } from '@/constants/theme';

// The concrete loop, in the order a reader lives it. A real sequence — so the
// connected steps carry meaning, not decoration.
const STEPS = [
  { Icon: BookPlus, label: 'List' },
  { Icon: MapPin, label: 'Match' },
  { Icon: ArrowLeftRight, label: 'Swap' },
];

// Book-spines that ride the orbit. Warm tones that read on cream.
const SPINE_COLORS = ['#E0B15A', '#D97941', '#8B5E3C', '#C9A97E', '#B0813F'];
const SPINE_HEIGHTS = [30, 26, 34, 27, 32];
const ORBIT_R = 86;

const spines = SPINE_COLORS.map((c, i) => {
  const angle = (-90 + i * (360 / SPINE_COLORS.length)) * (Math.PI / 180);
  return {
    c,
    h: SPINE_HEIGHTS[i],
    x: ORBIT_R * Math.cos(angle),
    y: ORBIT_R * Math.sin(angle),
    rot: i * (360 / SPINE_COLORS.length),
  };
});

/** The signature: books orbiting a central book — BookLoop, literally. */
function LoopHero({ reduceMotion }: { reduceMotion: boolean }) {
  const spin = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    spin.value = withRepeat(
      withTiming(360, { duration: 28000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [reduceMotion, spin]);

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  return (
    <View style={styles.loop}>
      {/* soft warm bloom */}
      <View style={styles.bloom} />
      {/* faint orbit ring */}
      <View style={styles.ring} />
      {/* orbiting spines */}
      <Animated.View style={[styles.orbitLayer, orbitStyle]}>
        {spines.map((s, i) => (
          <View
            key={i}
            style={[
              styles.spine,
              {
                height: s.h,
                backgroundColor: s.c,
                transform: [
                  { translateX: s.x },
                  { translateY: s.y },
                  { rotate: `${s.rot}deg` },
                ],
              },
            ]}
          />
        ))}
      </Animated.View>
      {/* the book at the centre of it all */}
      <View style={styles.centerTile}>
        <BookOpen size={30} color={BookLoopColors.cream} strokeWidth={2.2} />
      </View>
    </View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  // A single spark that flows List → Match → Swap and loops — the book moving
  // through the loop, made literal on the step rail.
  const flow = useSharedValue(0);
  const railW = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    flow.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [reduceMotion, flow]);

  const sparkStyle = useAnimatedStyle(() => ({
    // Visible for almost the whole List → Swap run; only the brief reset
    // (Swap → List) is hidden by the fade at the very ends.
    opacity: interpolate(flow.value, [0, 0.03, 0.94, 1], [0, 1, 1, 0]),
    transform: [{ translateX: 43 + flow.value * Math.max(0, railW.value - 86) }],
  }));

  // Skip entrance staggers under reduce-motion; render in place.
  const rise = (delay: number) =>
    reduceMotion
      ? undefined
      : FadeInDown.duration(520).delay(delay).easing(Easing.out(Easing.cubic));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FBEFD9', '#FFF8F0', '#FAF3E0']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Signature */}
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(700)}>
            <LoopHero reduceMotion={!!reduceMotion} />
          </Animated.View>

          {/* Pitch */}
          <Animated.View entering={rise(140)} style={styles.pitch}>
            <Text style={styles.wordmark}>BookLoop</Text>
            <Text style={styles.eyebrow}>GHANA&apos;S BOOK EXCHANGE COMMUNITY</Text>
            <Text style={styles.headline}>Every book deserves a</Text>
            <View style={styles.emphWrap}>
              <Text style={styles.headlineEmph}>second chapter</Text>
              <View style={styles.emphUnderline} />
            </View>
            <Text style={styles.subhead}>
              List the ones you&apos;ve read, discover ones you haven&apos;t — and
              swap with readers near you.
            </Text>
          </Animated.View>

          {/* The loop, made concrete */}
          <Animated.View
            entering={rise(300)}
            style={styles.steps}
            onLayout={(e) => {
              railW.value = e.nativeEvent.layout.width;
            }}
          >
            {!reduceMotion && (
              <Animated.View pointerEvents="none" style={[styles.spark, sparkStyle]} />
            )}
            {STEPS.map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <View style={styles.stepDash} />}
                <View style={styles.step}>
                  <View style={styles.stepIcon}>
                    <s.Icon size={19} color={BookLoopColors.coffeeBrown} strokeWidth={2} />
                  </View>
                  <Text style={styles.stepLabel}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </Animated.View>

          <View style={styles.spacer} />

          {/* Act */}
          <Animated.View entering={rise(440)} style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.9}
              onPress={() => router.push('/(auth)/phone-input')}
            >
              <Text style={styles.primaryText}>Get Started</Text>
              <ArrowRight size={20} color={BookLoopColors.cream} strokeWidth={2.4} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ghostBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.ghostText}>I already have an account</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: 24,
    paddingBottom: 20,
  },

  /* Loop hero */
  loop: {
    width: 220,
    height: 210,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  bloom: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: 'rgba(245,185,66,0.16)',
  },
  ring: {
    position: 'absolute',
    width: ORBIT_R * 2,
    height: ORBIT_R * 2,
    borderRadius: ORBIT_R,
    borderWidth: 1.5,
    borderColor: 'rgba(139,94,60,0.22)',
  },
  orbitLayer: {
    position: 'absolute',
    width: 220,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spine: {
    position: 'absolute',
    width: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  centerTile: {
    width: 64,
    height: 64,
    borderRadius: 19,
    backgroundColor: BookLoopColors.coffeeBrown,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BookLoopColors.coffeeBrown,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.34,
    shadowRadius: 16,
    elevation: 8,
  },

  /* Pitch */
  pitch: { alignItems: 'center', marginTop: 14 },
  wordmark: {
    fontFamily: 'Poppins-Bold',
    fontSize: 22,
    color: BookLoopColors.coffeeBrown,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  eyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    letterSpacing: 2,
    color: BookLoopColors.softLatte,
    marginTop: 4,
    marginBottom: 16,
  },
  headline: {
    fontFamily: 'Poppins-Bold',
    fontSize: 27,
    lineHeight: 33,
    color: BookLoopColors.deepEspresso,
    textAlign: 'center',
    fontWeight: '700',
  },
  emphWrap: { alignItems: 'center', marginTop: 1 },
  headlineEmph: {
    fontFamily: 'LibreBaskerville-Italic',
    fontSize: 29,
    lineHeight: 38,
    color: BookLoopColors.coffeeBrown,
    textAlign: 'center',
  },
  emphUnderline: {
    height: 4,
    width: '76%',
    borderRadius: 3,
    backgroundColor: BookLoopColors.mutedGold,
    marginTop: -3,
  },
  subhead: {
    fontFamily: 'Inter-Regular',
    fontSize: 14.5,
    lineHeight: 22,
    color: '#8A7A66',
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 4,
  },

  /* Steps */
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    paddingHorizontal: 6,
  },
  spark: {
    position: 'absolute',
    top: 18,
    left: 0,
    marginLeft: -4.5,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: BookLoopColors.goldDeep,
    shadowColor: BookLoopColors.goldDeep,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 4,
    zIndex: 5,
  },
  step: { alignItems: 'center', width: 74 },
  stepIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FBF1DE',
    borderWidth: 1,
    borderColor: 'rgba(139,94,60,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  stepLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
    color: BookLoopColors.deepEspresso,
    fontWeight: '600',
  },
  stepDash: {
    flex: 1,
    height: 0,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(139,94,60,0.28)',
    marginBottom: 26,
    marginHorizontal: -4,
  },

  spacer: { flex: 1, minHeight: 24 },

  /* Actions */
  actions: { gap: 6 },
  primaryBtn: {
    height: 56,
    borderRadius: 15,
    backgroundColor: BookLoopColors.coffeeBrown,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    shadowColor: BookLoopColors.coffeeBrown,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: BookLoopColors.cream,
    fontWeight: '600',
  },
  ghostBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: BookLoopColors.coffeeBrown,
    fontWeight: '600',
  },
});
