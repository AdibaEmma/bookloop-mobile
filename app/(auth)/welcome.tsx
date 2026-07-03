/**
 * Welcome Screen — design refresh 4a
 *
 * First screen for unauthenticated users. Logo tile + wordmark, a literary
 * hero card, three value-prop rows, and the primary / ghost CTAs.
 *
 * Navigation and routes are unchanged (Get Started → phone-input, secondary →
 * login); only the presentation was reworked to the design language.
 */

import React from 'react';
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
import { BookOpen, ArrowLeftRight, Gift, MapPin } from 'lucide-react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BookLoopColors } from '@/constants/theme';

const FEATURES = [
  { Icon: ArrowLeftRight, title: 'Exchange Books', desc: 'Trade with readers nearby' },
  { Icon: Gift, title: 'Donate & Share', desc: 'Give books a new home' },
  { Icon: MapPin, title: 'Find Locally', desc: 'Books in your neighbourhood' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const isDark = (useColorScheme() ?? 'light') === 'dark';

  const c = isDark
    ? {
        grad: [BookLoopColors.darkBg, BookLoopColors.darkBgDeep] as const,
        text: BookLoopColors.darkText,
        muted: BookLoopColors.darkTextMuted,
        sub: '#B49B7E',
        heroBg: BookLoopColors.darkSurface,
        heroBorder: BookLoopColors.darkBorder,
        featureTile: 'rgba(217,121,65,0.16)',
        featureIcon: BookLoopColors.burntOrange,
        ghost: BookLoopColors.burntOrange,
      }
    : {
        grad: [BookLoopColors.creamTop, BookLoopColors.cream] as const,
        text: BookLoopColors.deepEspresso,
        muted: BookLoopColors.mutedText,
        sub: BookLoopColors.authorText,
        heroBg: 'rgba(255,255,255,0.6)',
        heroBorder: 'rgba(139,94,60,0.14)',
        featureTile: 'rgba(217,121,65,0.14)',
        featureIcon: BookLoopColors.burntOrange,
        ghost: BookLoopColors.coffeeBrown,
      };

  return (
    <View style={styles.container}>
      <LinearGradient colors={c.grad} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.logoTile}>
              <BookOpen size={34} color={BookLoopColors.cream} strokeWidth={2} />
            </View>
            <Text style={[styles.wordmark, { color: c.text }]}>BookLoop</Text>
            <Text style={[styles.tagline, { color: c.muted }]}>Ghana's Book Exchange Community</Text>
          </View>

          {/* Hero */}
          <View style={[styles.hero, { backgroundColor: c.heroBg, borderColor: c.heroBorder }]}>
            <Text style={[styles.heroTitle, { color: c.text }]}>
              Your books deserve a second chapter
            </Text>
            <Text style={[styles.heroSub, { color: c.sub }]}>
              Trade, donate, and discover books in your neighbourhood
            </Text>
          </View>

          {/* Features */}
          <View style={styles.features}>
            {FEATURES.map(({ Icon, title, desc }) => (
              <View key={title} style={styles.featureRow}>
                <View style={[styles.featureTile, { backgroundColor: c.featureTile }]}>
                  <Icon size={22} color={c.featureIcon} strokeWidth={2} />
                </View>
                <View style={styles.featureText}>
                  <Text style={[styles.featureTitle, { color: c.text }]}>{title}</Text>
                  <Text style={[styles.featureDesc, { color: c.sub }]}>{desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* CTAs */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/(auth)/phone-input')}
            >
              <Text style={styles.primaryText}>Get Started</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ghostBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={[styles.ghostText, { color: c.ghost }]}>I already have an account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 28,
  },
  brand: {
    alignItems: 'center',
    marginTop: 14,
  },
  logoTile: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: BookLoopColors.coffeeBrown,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BookLoopColors.coffeeBrown,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 8,
  },
  wordmark: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 14,
  },
  tagline: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 3,
  },
  hero: {
    marginTop: 22,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  heroTitle: {
    fontFamily: 'LibreBaskerville-Regular',
    fontSize: 19,
    fontWeight: '600',
    lineHeight: 26,
    textAlign: 'center',
  },
  heroSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  features: {
    marginTop: 18,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  featureTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: { flex: 1 },
  featureTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    fontWeight: '600',
  },
  featureDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 1,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: 22,
    gap: 10,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: BookLoopColors.coffeeBrown,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BookLoopColors.coffeeBrown,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 6,
  },
  primaryText: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    fontWeight: '600',
    color: BookLoopColors.cream,
  },
  ghostBtn: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    fontWeight: '600',
  },
});
