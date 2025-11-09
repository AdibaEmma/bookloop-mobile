/**
 * Home Screen (Feed)
 *
 * Personalized dashboard with recommendations and nearby listings.
 *
 * Features:
 * - Personalized greeting
 * - Popular listings from other users
 * - Nearby listings feed
 * - Quick stats overview
 * - Pull to refresh
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Image,
  Appearance,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { GlassCard, GlassButton, BookCard } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { listingsService, Listing } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { showError } from '@/utils/errorHandler';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
  BorderRadius,
} from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [popularListings, setPopularListings] = useState<Listing[]>([]);
  const [nearbyListings, setNearbyListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];

  /**
   * Toggle theme
   */
  const toggleTheme = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newScheme = colorScheme === 'light' ? 'dark' : 'light';
    Appearance.setColorScheme(newScheme);
  };

  /**
   * Get user location
   */
  const getLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        return null;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      return {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
    } catch (error) {
      console.error('Location error:', error);
      return null;
    }
  };

  /**
   * Load all home screen data
   */
  const loadHomeData = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      // Get location
      let currentLocation = location;
      if (!currentLocation) {
        currentLocation = await getLocation();
        setLocation(currentLocation);
      }

      // Load popular listings and nearby listings in parallel
      const [popularListingsData, nearbyListingsData] = await Promise.allSettled([
        listingsService.searchListings({
          limit: 20, // Fetch more to account for filtering
        }),
        currentLocation
          ? listingsService.searchListings({
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              radiusMeters: 5000,
              limit: 10,
            })
          : Promise.resolve({ data: [] }),
      ]);

      // Update popular listings (filter out logged-in user's listings)
      if (popularListingsData.status === 'fulfilled') {
        const data = popularListingsData.value.data || popularListingsData.value || [];
        const listings = Array.isArray(data) ? data : [];
        // Filter out current user's listings
        const otherUsersListings = listings.filter(
          (listing) => listing.userId !== user?.id
        );
        // Take top 10
        setPopularListings(otherUsersListings.slice(0, 10));
      }

      // Update nearby listings (also filter out logged-in user's listings)
      if (nearbyListingsData.status === 'fulfilled') {
        const data = nearbyListingsData.value.data || nearbyListingsData.value || [];
        const listings = Array.isArray(data) ? data : [];
        // Filter out current user's listings
        const otherUsersListings = listings.filter(
          (listing) => listing.userId !== user?.id
        );
        setNearbyListings(otherUsersListings);
      }
    } catch (error: any) {
      console.error('Failed to load home data:', error);
      showError(error, 'Failed to Load Feed');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  /**
   * Initial load - only load when user is authenticated
   */
  useEffect(() => {
    if (user) {
      loadHomeData();
      // Animate in with stagger effect
      Animated.stagger(100, [
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [user]);

  /**
   * Refresh handler
   */
  const handleRefresh = useCallback(() => {
    loadHomeData(true);
  }, [location]);

  /**
   * Navigate to listing detail
   */
  const handleListingPress = (listing: Listing) => {
    router.push({
      pathname: '/listing/[id]',
      params: { id: listing.id },
    });
  };

  /**
   * Navigate to explore tab
   */
  const handleSeeAllListings = () => {
    router.push('/explore');
  };

  /**
   * Render popular listing item
   */
  const renderPopularListing = (listing: Listing) => (
    <TouchableOpacity
      key={listing.id}
      style={[styles.bookItem, { backgroundColor: colors.surface }]}
      onPress={() => handleListingPress(listing)}
      activeOpacity={0.7}
    >
      <View style={styles.bookCover}>
        {listing.book.coverImage ? (
          <View style={styles.bookCoverPlaceholder}>
            <Text style={[styles.bookCoverText, { color: colors.textSecondary }]}>
              {listing.book.title.charAt(0)}
            </Text>
          </View>
        ) : (
          <View style={styles.bookCoverPlaceholder}>
            <Ionicons name="book" size={24} color={colors.textSecondary} />
          </View>
        )}
      </View>
      <Text
        style={[styles.bookTitle, { color: colors.text }]}
        numberOfLines={2}
      >
        {listing.book.title}
      </Text>
      <Text
        style={[styles.bookAuthor, { color: colors.textSecondary }]}
        numberOfLines={1}
      >
        {listing.book.author}
      </Text>
      {listing.distance && (
        <Text
          style={[styles.bookDistance, { color: BookLoopColors.burntOrange }]}
          numberOfLines={1}
        >
          {(listing.distance / 1000).toFixed(1)}km away
        </Text>
      )}
    </TouchableOpacity>
  );

  /**
   * Render nearby listing item
   */
  const renderNearbyListing = (listing: Listing) => (
    <View key={listing.id} style={styles.listingItem}>
      <BookCard
        title={listing.book.title}
        author={listing.book.author}
        coverImage={listing.book.coverImage}
        condition={listing.condition}
        listingType={listing.listingType}
        distance={listing.distance}
        onPress={() => handleListingPress(listing)}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={
            colorScheme === 'light'
              ? [BookLoopColors.cream, BookLoopColors.lightPeach]
              : [BookLoopColors.deepBrown, BookLoopColors.charcoal]
          }
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading your feed...
          </Text>
        </View>
      </View>
    );
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

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={BookLoopColors.burntOrange}
            />
          }
        >
          {/* Header with Avatar and Icons */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Top Row: Avatar and Action Icons */}
            <View style={styles.headerTopRow}>
              {/* Avatar */}
              <TouchableOpacity
                style={styles.avatarContainer}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(tabs)/profile');
                }}
                activeOpacity={0.7}
              >
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: BookLoopColors.burntOrange + '20' }]}>
                    <Text style={[styles.avatarText, { color: BookLoopColors.burntOrange }]}>
                      {(user?.firstName?.charAt(0) || '') + (user?.lastName?.charAt(0) || '') || '?'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.spacer} />

              {/* Action Icons */}
              <View style={styles.actionIcons}>
                {/* Theme Toggle */}
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={toggleTheme}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
                    <Ionicons
                      name={colorScheme === 'light' ? 'moon' : 'sunny'}
                      size={18}
                      color={BookLoopColors.burntOrange}
                    />
                  </View>
                </TouchableOpacity>

                {/* Notification Bell */}
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/notifications');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
                    <Ionicons name="notifications" size={18} color={BookLoopColors.burntOrange} />
                    {/* Notification badge */}
                    <View style={styles.notificationBadge}>
                      <View style={styles.notificationDot} />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Greeting Below */}
            <View style={styles.greetingSection}>
              <Text style={[styles.greetingText, { color: colors.text }]}>
                Hello, {user?.firstName || 'Reader'}! 👋
              </Text>
              <Text style={[styles.subGreeting, { color: colors.textSecondary }]}>
                Discover your next great read 📚
              </Text>
            </View>
          </Animated.View>

          {/* Stats Overview - Animated */}
          <Animated.View
            style={[
              styles.statsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.statsRow}>
              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: colors.surface }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(tabs)/profile');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.statIconContainer, { backgroundColor: BookLoopColors.burntOrange + '15' }]}>
                  <Text style={styles.statEmoji}>🧘</Text>
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {user?.karma || 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Karma Points
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: colors.surface }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(tabs)/explore');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.statIconContainer, { backgroundColor: BookLoopColors.success + '15' }]}>
                  <Text style={styles.statEmoji}>📍</Text>
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {nearbyListings.length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Nearby Books
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statCard, { backgroundColor: colors.surface }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(tabs)/explore');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.statIconContainer, { backgroundColor: BookLoopColors.info + '15' }]}>
                  <Text style={styles.statEmoji}>🔥</Text>
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {popularListings.length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Trending Now
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Quick Actions - Animated */}
          <Animated.View
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: Spacing.md }]}>
              Quick Actions ⚡
            </Text>
            <View style={styles.quickActionsGrid}>
              {[
                {
                  title: 'List Book',
                  emoji: '📚',
                  description: 'Share',
                  route: '/(tabs)/my-books',
                  gradient: ['#FF6B6B', '#EE5A6F'],
                },
                {
                  title: 'Nearby',
                  emoji: '📍',
                  description: 'Discover',
                  route: '/(tabs)/explore',
                  gradient: ['#4ECDC4', '#44A08D'],
                },
                {
                  title: 'Swaps',
                  emoji: '🔄',
                  description: 'Exchanges',
                  route: '/(tabs)/my-books',
                  gradient: ['#F7B733', '#FC4A1A'],
                },
                {
                  title: 'Goals',
                  emoji: '🎯',
                  description: 'Progress',
                  route: '/(tabs)/profile',
                  gradient: ['#667EEA', '#764BA2'],
                },
              ].map((action, index) => (
                <TouchableOpacity
                  key={action.title}
                  style={styles.quickActionCard}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push(action.route as any);
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={action.gradient as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.quickActionGradient}
                  >
                    <View style={styles.quickActionContent}>
                      <Text style={styles.quickActionEmoji}>{action.emoji}</Text>
                      <Text style={styles.quickActionTitle}>{action.title}</Text>
                      <Text style={styles.quickActionDescription}>{action.description}</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

        {/* Popular Listings Section - Animated */}
        {popularListings.length > 0 && (
          <Animated.View
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Popular Listings
              </Text>
              <TouchableOpacity onPress={handleSeeAllListings}>
                <Text style={[styles.seeAllText, { color: BookLoopColors.burntOrange }]}>
                  See All
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {popularListings.map((listing) => renderPopularListing(listing))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Nearby Listings Section - Animated */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Books Near You
            </Text>
            <TouchableOpacity onPress={handleSeeAllListings}>
              <Text style={[styles.seeAllText, { color: BookLoopColors.burntOrange }]}>
                See All
              </Text>
            </TouchableOpacity>
          </View>

          {nearbyListings.length > 0 ? (
            <View style={styles.listingsGrid}>
              {nearbyListings.map((listing) => renderNearbyListing(listing))}
            </View>
          ) : (
            <GlassCard variant="lg" padding="xl">
              <View style={styles.emptyContent}>
                <Ionicons
                  name="location-outline"
                  size={48}
                  color={colors.textSecondary}
                  style={styles.emptyIcon}
                />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No Books Nearby
                </Text>
                <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                  {location
                    ? 'No listings found in your area. Check back soon!'
                    : 'Enable location to discover books near you'}
                </Text>
                {!location && (
                  <GlassButton
                    title="Enable Location"
                    onPress={() => loadHomeData(true)}
                    variant="primary"
                    size="md"
                    style={styles.emptyButton}
                  />
                )}
              </View>
            </GlassCard>
          )}
        </Animated.View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },
  header: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarContainer: {
    // Avatar takes up left side
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  spacer: {
    flex: 1,
  },
  actionIcons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  iconButton: {
    // Individual icon button wrapper
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BookLoopColors.error,
  },
  greetingSection: {
    marginTop: Spacing.xs,
  },
  greetingText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.body,
  },
  statsContainer: {
    marginBottom: Spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
  },
  statEmoji: {
    fontSize: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  quickActionCard: {
    width: '23%',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  quickActionGradient: {
    padding: Spacing.sm,
    minHeight: 85,
    justifyContent: 'space-between',
  },
  quickActionContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  quickActionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickActionTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  quickActionDescription: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  section: {
    marginBottom: Spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
  },
  seeAllText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  horizontalScroll: {
    paddingRight: Spacing.lg,
    gap: Spacing.md,
  },
  bookItem: {
    width: 120,
    borderRadius: 12,
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  bookCover: {
    width: '100%',
    aspectRatio: 2 / 3,
    marginBottom: Spacing.sm,
    borderRadius: 8,
    overflow: 'hidden',
  },
  bookCoverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookCoverText: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
  },
  bookTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  bookAuthor: {
    fontSize: Typography.fontSize.xs,
  },
  bookDistance: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    marginTop: Spacing.xs,
  },
  listingsGrid: {
    gap: Spacing.md,
  },
  listingItem: {
    marginBottom: Spacing.sm,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: Spacing.md,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  emptyButton: {
    marginTop: Spacing.sm,
  },
});
