/**
 * Exchanges Tab
 *
 * View and manage book exchange requests.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard, GlassButton } from '@/components/ui';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';

export default function ExchangesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Exchanges</Text>
        </View>

        <View style={styles.content}>
          {/* Coming Soon Card */}
          <GlassCard variant="lg" padding="xl" style={styles.card}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="swap-horizontal"
                size={64}
                color={BookLoopColors.burntOrange}
              />
            </View>

            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Exchange Management
            </Text>

            <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
              Manage incoming and outgoing book exchange requests, track exchange
              status, and complete exchanges.
            </Text>

            <GlassButton
              title="View My Exchanges"
              onPress={() => router.push('/exchange/my-exchanges')}
              variant="primary"
              size="md"
              icon="arrow-forward"
              style={styles.button}
            />

            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: BookLoopColors.burntOrange }]}>
                  0
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Pending
                </Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: BookLoopColors.burntOrange }]}>
                  0
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Active
                </Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: BookLoopColors.burntOrange }]}>
                  0
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Completed
                </Text>
              </View>
            </View>
          </GlassCard>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
  },
  card: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
  },
  button: {
    marginBottom: Spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 94, 60, 0.2)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(139, 94, 60, 0.2)',
  },
});
