/**
 * User Profile Screen
 *
 * View user profile with karma score and exchange history.
 *
 * Features:
 * - User info (name, avatar, karma)
 * - Exchange statistics
 * - Active listings
 * - Recent ratings/reviews
 * - Contact/message button
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard, GlassButton, BookCard, Avatar } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { usersService, listingsService } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  avatarUrl?: string;
  bio?: string;
  karma: number;
  subscriptionTier: 'free' | 'basic' | 'premium';
  stats: {
    totalExchanges: number;
    activeListings: number;
    completedExchanges: number;
    averageRating: number;
  };
  createdAt: string;
}

interface Rating {
  id: string;
  rating: number;
  review?: string;
  reviewer: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isOwnProfile = currentUser?.id === id;

  /**
   * Load profile data
   */
  useEffect(() => {
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);

      // Load user profile
      const profileData = await usersService.getUserById(id);
      setProfile(profileData);

      // Load user's active listings
      const userListings = await listingsService.getUserListings(id);
      setListings(userListings.slice(0, 4)); // Show first 4

      // Load ratings (mock for now)
      // TODO: Implement ratings API
      const mockRatings: Rating[] = [
        {
          id: '1',
          rating: 5,
          review: 'Great exchange! Book was in excellent condition.',
          reviewer: {
            firstName: 'John',
            lastName: 'Doe',
            avatarUrl: undefined,
          },
          createdAt: new Date().toISOString(),
        },
      ];
      setRatings(mockRatings);
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load profile');
      router.back();
    } finally {
      setIsLoading(false);
    }
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

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <LinearGradient
          colors={
            colorScheme === 'light'
              ? [BookLoopColors.cream, BookLoopColors.lightPeach]
              : [BookLoopColors.deepBrown, BookLoopColors.charcoal]
          }
          style={StyleSheet.absoluteFillObject}
        />
        <ActivityIndicator size="large" color={BookLoopColors.burntOrange} />
      </View>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isOwnProfile ? 'My Profile' : 'Profile',
          headerShown: true,
          headerRight: () =>
            isOwnProfile ? (
              <TouchableOpacity
                onPress={() => router.push('/settings')}
                style={styles.headerButton}
              >
                <Ionicons
                  name="settings-outline"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            ) : null,
        }}
      />

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

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header */}
          <GlassCard variant="lg" padding="lg">
            <View style={styles.profileHeader}>
              <Avatar
                imageUrl={profile.avatarUrl}
                name={`${profile.firstName} ${profile.lastName}`}
                size={80}
              />

              <View style={styles.profileInfo}>
                <Text style={[styles.name, { color: colors.text }]}>
                  {profile.firstName} {profile.lastName}
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
                    {profile.karma} Karma
                  </Text>
                </View>

                {/* Subscription Tier */}
                <View
                  style={[
                    styles.tierBadge,
                    {
                      backgroundColor: getSubscriptionColor(
                        profile.subscriptionTier
                      ),
                    },
                  ]}
                >
                  <Text style={styles.tierText}>
                    {getSubscriptionLabel(profile.subscriptionTier)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Bio */}
            {profile.bio && (
              <Text style={[styles.bio, { color: colors.textSecondary }]}>
                {profile.bio}
              </Text>
            )}

            {/* Edit/Message Button */}
            {isOwnProfile ? (
              <GlassButton
                title="Edit Profile"
                onPress={() => router.push('/profile/edit')}
                variant="ghost"
                size="sm"
                icon="create-outline"
                style={styles.actionButton}
              />
            ) : (
              <GlassButton
                title="Send Message"
                onPress={() => {
                  /* TODO: Implement messaging */
                  Alert.alert('Coming Soon', 'Messaging feature coming soon!');
                }}
                variant="primary"
                size="sm"
                icon="chatbubble-outline"
                style={styles.actionButton}
              />
            )}
          </GlassCard>

          {/* Statistics */}
          <GlassCard variant="lg" padding="lg">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Exchange Statistics
            </Text>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {profile.stats.totalExchanges}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Total Exchanges
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {profile.stats.activeListings}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Active Listings
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {profile.stats.completedExchanges}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Completed
                </Text>
              </View>

              <View style={styles.statItem}>
                <View style={styles.ratingValue}>
                  <Ionicons name="star" size={20} color={BookLoopColors.burntOrange} />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {profile.stats.averageRating.toFixed(1)}
                  </Text>
                </View>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Avg Rating
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Active Listings */}
          {listings.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Active Listings
                </Text>
                {listings.length > 4 && (
                  <TouchableOpacity
                    onPress={() =>
                      router.push(
                        isOwnProfile ? '/listings/my-listings' : `/listings/user/${id}`
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.seeAllText,
                        { color: BookLoopColors.burntOrange },
                      ]}
                    >
                      See All
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {listings.map((listing) => (
                <BookCard
                  key={listing.id}
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
                  style={styles.listingCard}
                />
              ))}
            </View>
          )}

          {/* Reviews */}
          {ratings.length > 0 && (
            <GlassCard variant="lg" padding="lg">
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Recent Reviews
              </Text>

              {ratings.map((rating) => (
                <View key={rating.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Avatar
                      imageUrl={rating.reviewer.avatarUrl}
                      name={`${rating.reviewer.firstName} ${rating.reviewer.lastName}`}
                      size={32}
                    />

                    <View style={styles.reviewInfo}>
                      <Text style={[styles.reviewerName, { color: colors.text }]}>
                        {rating.reviewer.firstName} {rating.reviewer.lastName}
                      </Text>

                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= rating.rating ? 'star' : 'star-outline'}
                            size={14}
                            color={BookLoopColors.burntOrange}
                          />
                        ))}
                      </View>
                    </View>
                  </View>

                  {rating.review && (
                    <Text style={[styles.reviewText, { color: colors.textSecondary }]}>
                      {rating.review}
                    </Text>
                  )}
                </View>
              ))}
            </GlassCard>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  headerButton: {
    marginRight: Spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  karmaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  karmaText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
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
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
  },
  ratingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
    marginTop: 4,
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
  seeAllText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  listingCard: {
    marginBottom: Spacing.sm,
  },
  reviewCard: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    marginTop: Spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
});
