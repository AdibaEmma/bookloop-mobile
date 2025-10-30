/**
 * Welcome Screen
 *
 * First screen shown to unauthenticated users.
 *
 * Features:
 * - App logo and branding
 * - Hero illustration
 * - Value propositions
 * - Get Started / Login buttons
 * - Beautiful glassmorphic design
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassButton, GlassCard } from '@/components/ui';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const features = [
    {
      icon: 'swap-horizontal' as const,
      title: 'Exchange Books',
      description: 'Trade your books with readers nearby',
    },
    {
      icon: 'gift' as const,
      title: 'Donate & Share',
      description: 'Give books a new home, spread knowledge',
    },
    {
      icon: 'location' as const,
      title: 'Find Locally',
      description: 'Discover books in your neighborhood',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={
          colorScheme === 'light'
            ? [BookLoopColors.cream, BookLoopColors.lightPeach]
            : [BookLoopColors.deepBrown, BookLoopColors.charcoal]
        }
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo and Branding */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons
                name="book"
                size={48}
                color={BookLoopColors.coffeeBrown}
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              BookLoop
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Ghana's Book Exchange Community
            </Text>
          </View>

          {/* Hero Illustration */}
          <View style={styles.heroContainer}>
            <GlassCard variant="lg" padding="xl" blurIntensity={30}>
              <View style={styles.heroContent}>
                <Ionicons
                  name="book-outline"
                  size={120}
                  color={BookLoopColors.burntOrange}
                  style={styles.heroIcon}
                />
                <Text style={[styles.heroText, { color: colors.text }]}>
                  Your books deserve a second chapter
                </Text>
              </View>
            </GlassCard>
          </View>

          {/* Features */}
          <View style={styles.features}>
            {features.map((feature, index) => (
              <GlassCard
                key={index}
                variant="md"
                padding="md"
                style={styles.featureCard}
              >
                <View style={styles.featureContent}>
                  <View
                    style={[
                      styles.featureIconContainer,
                      { backgroundColor: `${BookLoopColors.burntOrange}20` },
                    ]}
                  >
                    <Ionicons
                      name={feature.icon}
                      size={24}
                      color={BookLoopColors.burntOrange}
                    />
                  </View>
                  <View style={styles.featureText}>
                    <Text
                      style={[styles.featureTitle, { color: colors.text }]}
                    >
                      {feature.title}
                    </Text>
                    <Text
                      style={[
                        styles.featureDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {feature.description}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>

          {/* CTA Buttons */}
          <View style={styles.actions}>
            <GlassButton
              title="Get Started"
              onPress={() => router.push('/(auth)/phone-input')}
              variant="primary"
              size="lg"
              style={styles.primaryButton}
            />

            <GlassButton
              title="I Already Have an Account"
              onPress={() => router.push('/(auth)/login')}
              variant="ghost"
              size="lg"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing['3xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${BookLoopColors.cream}80`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize['4xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.body,
  },
  heroContainer: {
    marginBottom: Spacing['2xl'],
  },
  heroContent: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  heroIcon: {
    marginBottom: Spacing.lg,
    opacity: 0.9,
  },
  heroText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.literary,
    textAlign: 'center',
    lineHeight: 28,
  },
  features: {
    marginBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  featureCard: {
    marginBottom: 0,
  },
  featureContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  featureDescription: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  actions: {
    gap: Spacing.md,
  },
  primaryButton: {
    marginBottom: 0,
  },
});
