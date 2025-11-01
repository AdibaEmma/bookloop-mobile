/**
 * Profile Tab
 *
 * Display current user's profile with access to settings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard, GlassButton, BookCard, Avatar } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { listingsService } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';

export default function ProfileTab() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [listings, setListings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load user's listings
   */
  useEffect(() => {
    if (user) {
      loadListings();
    }
  }, [user]);

  const loadListings = async () => {
    try {
      setIsLoading(true);
      const userListings = await listingsService.getUserListings(user!.id);
      setListings(userListings.slice(0, 4)); // Show first 4
    } catch (error) {
      console.error('Failed to load listings:', error);
      // Fail silently - user can still navigate to see all listings
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/(auth)/welcome');
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Error', 'Failed to logout');
          }
        },
      },
    ]);
  };

  /**
   * Get subscription tier label
   */
  const getSubscriptionLabel = (tier: string): string => {
    const labels: Record<string, string> = {
      free: 'Free',
      basic: 'Basic',
      premium: 'Premium',
    };
    return labels[tier] || tier;
  };

  /**
   * Get subscription color
   */
  const getSubscriptionColor = (tier: string): string => {
    const colors: Record<string, string> = {
      free: '#8E8E93',
      basic: '#007AFF',
      premium: '#FF9500',
    };
    return colors[tier] || '#8E8E93';
  };

  if (!user) {
    return null;
  }

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

      {/* Header with Settings */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={styles.settingsButton}
        >
          <Ionicons
            name="settings-outline"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <GlassCard variant="lg" padding="lg" style={styles.card}>
          <View style={styles.profileHeaderCentered}>
            <Avatar
              imageUrl={user.avatarUrl}
              name={`${user.firstName} ${user.lastName}`}
              size="xl"
            />

            <Text style={[styles.name, { color: colors.text }]}>
              {user.firstName} {user.lastName}
            </Text>

            {/* Karma */}
            <View style={styles.karmaContainer}>
              <Ionicons
                name="trophy"
                size={20}
                color={BookLoopColors.burntOrange}
              />
              <Text
                style={[
                  styles.karmaText,
                  { color: BookLoopColors.burntOrange },
                ]}
              >
                {user.karma || 0} Karma
              </Text>
            </View>

            {/* Subscription Tier */}
            <View
              style={[
                styles.tierBadge,
                {
                  backgroundColor: getSubscriptionColor(
                    user.subscriptionTier || 'free'
                  ),
                },
              ]}
            >
              <Text style={styles.tierText}>
                {getSubscriptionLabel(user.subscriptionTier || 'free')}
              </Text>
            </View>
          </View>

          {/* Bio */}
          {user.bio && (
            <Text style={[styles.bio, { color: colors.textSecondary }]}>
              {user.bio}
            </Text>
          )}

          {/* Edit Profile Button */}
          <GlassButton
            title="Edit Profile"
            onPress={() => router.push(`/profile/${user.id}`)}
            variant="ghost"
            size="sm"
            icon="create-outline"
            style={styles.actionButton}
          />
        </GlassCard>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <View style={styles.quickActions}>
          <TouchableOpacity
            onPress={() => router.push('/listings/my-listings')}
            style={[styles.quickActionCard, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="book" size={32} color={BookLoopColors.burntOrange} />
            <Text style={[styles.quickActionTitle, { color: colors.text }]}>
              My Listings
            </Text>
            <Text style={[styles.quickActionCount, { color: colors.textSecondary }]}>
              {listings.length}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/exchange/my-exchanges')}
            style={[styles.quickActionCard, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="swap-horizontal" size={32} color={BookLoopColors.burntOrange} />
            <Text style={[styles.quickActionTitle, { color: colors.text }]}>
              Exchanges
            </Text>
            <Text style={[styles.quickActionCount, { color: colors.textSecondary }]}>
              0
            </Text>
          </TouchableOpacity>
          </View>
        </View>

        {/* Subscription */}
        <View style={styles.sectionContainer}>
          <GlassCard variant="lg" padding="lg">
            <View style={styles.subscriptionHeader}>
              <Ionicons name="star" size={32} color={BookLoopColors.burntOrange} />
              <Text style={[styles.subscriptionTitle, { color: colors.text }]}>
                Subscription Plan
              </Text>
            </View>

            <View style={styles.subscriptionContent}>
              <View
                style={[
                  styles.currentPlanBadge,
                  {
                    backgroundColor: getSubscriptionColor(
                      user.subscriptionTier || 'free'
                    ),
                  },
                ]}
              >
                <Text style={styles.currentPlanText}>
                  {getSubscriptionLabel(user.subscriptionTier || 'free').toUpperCase()} PLAN
                </Text>
              </View>

              <Text style={[styles.subscriptionDescription, { color: colors.textSecondary }]}>
                {user.subscriptionTier === 'free'
                  ? 'Upgrade to unlock premium features and benefits'
                  : user.subscriptionTier === 'basic'
                  ? 'Enjoying Basic features. Upgrade to Premium for more!'
                  : 'You have full access to all premium features'}
              </Text>

              <GlassButton
                title={user.subscriptionTier === 'free' ? 'Upgrade Plan' : 'Manage Subscription'}
                onPress={() => router.push('/subscription')}
                variant="primary"
                size="md"
                icon="arrow-forward"
              />
            </View>
          </GlassCard>
        </View>

        {/* Recent Listings */}
        {!isLoading && listings.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Recent Listings
              </Text>
              <TouchableOpacity onPress={() => router.push('/listings/my-listings')}>
                <Text
                  style={[
                    styles.seeAllText,
                    { color: BookLoopColors.burntOrange },
                  ]}
                >
                  See All
                </Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <ActivityIndicator size="small" color={BookLoopColors.burntOrange} />
            ) : (
              listings.map((listing) => (
                <View key={listing.id} style={styles.listingCard}>
                  <BookCard
                    title={listing.book.title}
                    author={listing.book.author}
                    coverImage={listing.book.coverImageUrl}
                    condition={listing.condition}
                    listingType={listing.listingType}
                    onPress={() =>
                      router.push({
                        pathname: '/listing/[id]',
                        params: { id: listing.id },
                      })
                    }
                  />
                </View>
              ))
            )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Logout Button - Fixed at Bottom */}
      <View style={[styles.logoutContainer, { paddingBottom: insets.bottom || Spacing.lg }]}>
        <GlassButton
          title="Logout"
          onPress={handleLogout}
          variant="ghost"
          size="lg"
          icon="log-out-outline"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for fixed logout button
  },
  profileHeaderCentered: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  name: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  karmaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  karmaText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  tierBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
  },
  tierText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  bio: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  actionButton: {
    marginTop: Spacing.sm,
  },
  card: {
    marginHorizontal: Spacing.lg,
  },
  quickActionsContainer: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  sectionContainer: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  quickActionCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  quickActionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
  quickActionCount: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
  },
  quickActionSubtext: {
    fontSize: Typography.fontSize.xs,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
  },
  seeAllText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  listingCard: {
    marginBottom: Spacing.sm,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  subscriptionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  subscriptionContent: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  currentPlanBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  currentPlanText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 1,
  },
  subscriptionDescription: {
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  logoutContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: 'transparent',
  },
});
