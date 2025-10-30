/**
 * Home Screen (Feed)
 *
 * Main feed showing nearby book listings.
 *
 * Features:
 * - Location-based listing feed
 * - Pull to refresh
 * - Filter by listing type
 * - Book cards with distance
 * - Quick search access
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { GlassCard, GlassButton, BookCard } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { listingsService, Listing } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<'all' | 'exchange' | 'donate' | 'borrow'>('all');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const listingTypes = [
    { value: 'all' as const, label: 'All', icon: 'apps' as const },
    { value: 'exchange' as const, label: 'Exchange', icon: 'swap-horizontal' as const },
    { value: 'donate' as const, label: 'Donate', icon: 'gift' as const },
    { value: 'borrow' as const, label: 'Borrow', icon: 'time' as const },
  ];

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
   * Load listings
   */
  const loadListings = async (refresh = false) => {
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

      // Fetch listings
      if (currentLocation) {
        const response = await listingsService.getNearbyListings(
          currentLocation.latitude,
          currentLocation.longitude,
          5000, // 5km radius
          20,
        );

        let filteredListings = response.data;

        // Filter by type
        if (selectedType !== 'all') {
          filteredListings = filteredListings.filter(
            (listing) => listing.listingType === selectedType,
          );
        }

        setListings(filteredListings);
      } else {
        Alert.alert(
          'Location Required',
          'Please enable location to see nearby books',
        );
      }
    } catch (error: any) {
      console.error('Failed to load listings:', error);
      Alert.alert('Error', 'Failed to load listings');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  /**
   * Initial load
   */
  useEffect(() => {
    loadListings();
  }, [selectedType]);

  /**
   * Refresh handler
   */
  const handleRefresh = useCallback(() => {
    loadListings(true);
  }, [selectedType]);

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
   * Navigate to search
   */
  const handleSearch = () => {
    router.push('/search');
  };

  /**
   * Render listing item
   */
  const renderListing = ({ item }: { item: Listing }) => (
    <BookCard
      title={item.book.title}
      author={item.book.author}
      coverImage={item.book.coverImageUrl}
      condition={item.condition}
      listingType={item.listingType}
      distance={item.distance}
      onPress={() => handleListingPress(item)}
    />
  );

  /**
   * Render empty state
   */
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <GlassCard variant="lg" padding="xl">
        <View style={styles.emptyContent}>
          <Ionicons
            name="book-outline"
            size={64}
            color={colors.textSecondary}
            style={styles.emptyIcon}
          />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No Books Nearby
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
            {location
              ? 'Try expanding your search radius or check back later'
              : 'Enable location to discover books near you'}
          </Text>
          {!location && (
            <GlassButton
              title="Enable Location"
              onPress={() => loadListings(true)}
              variant="primary"
              size="md"
              style={styles.emptyButton}
            />
          )}
        </View>
      </GlassCard>
    </View>
  );

  /**
   * Render header
   */
  const renderHeader = () => (
    <View style={styles.header}>
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={[styles.greetingText, { color: colors.text }]}>
          Hello, {user?.firstName || 'Reader'}!
        </Text>
        <Text style={[styles.subGreeting, { color: colors.textSecondary }]}>
          Discover books near you
        </Text>
      </View>

      {/* Search Bar */}
      <TouchableOpacity
        onPress={handleSearch}
        style={[styles.searchBar, { backgroundColor: colors.surface }]}
      >
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <Text style={[styles.searchPlaceholder, { color: colors.textSecondary }]}>
          Search books, authors...
        </Text>
      </TouchableOpacity>

      {/* Type Filter */}
      <View style={styles.filterContainer}>
        {listingTypes.map((type) => (
          <TouchableOpacity
            key={type.value}
            onPress={() => setSelectedType(type.value)}
            style={[
              styles.filterButton,
              {
                backgroundColor:
                  selectedType === type.value
                    ? BookLoopColors.burntOrange
                    : colors.surface,
              },
            ]}
          >
            <Ionicons
              name={type.icon}
              size={16}
              color={selectedType === type.value ? '#FFFFFF' : colors.text}
            />
            <Text
              style={[
                styles.filterText,
                {
                  color: selectedType === type.value ? '#FFFFFF' : colors.text,
                },
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

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
        <FlatList
          data={listings}
          renderItem={renderListing}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={!isLoading ? renderEmpty : null}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={BookLoopColors.burntOrange}
            />
          }
        />
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
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  header: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  greeting: {
    marginBottom: Spacing.xs,
  },
  greetingText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
  },
  subGreeting: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.body,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  searchPlaceholder: {
    fontSize: Typography.fontSize.base,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    gap: Spacing.xs,
  },
  filterText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  emptyContainer: {
    paddingTop: Spacing['3xl'],
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: Spacing.lg,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    marginTop: Spacing.md,
  },
});
