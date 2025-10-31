/**
 * Explore Screen
 *
 * Browse books by category and see featured listings.
 *
 * Features:
 * - Category browsing
 * - Popular/recent listings
 * - Quick search access
 * - Featured books
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { GlassCard, BookCard } from '@/components/ui';
import { listingsService, Listing } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';

const { width } = Dimensions.get('window');
const CATEGORY_CARD_WIDTH = 150;

interface Category {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export default function ExploreScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const categories: Category[] = [
    { name: 'Fiction', icon: 'book', color: '#FF6B6B' },
    { name: 'Non-Fiction', icon: 'document-text', color: '#4ECDC4' },
    { name: 'Science', icon: 'flask', color: '#45B7D1' },
    { name: 'History', icon: 'time', color: '#FFA07A' },
    { name: 'Biography', icon: 'person', color: '#98D8C8' },
    { name: 'Fantasy', icon: 'planet', color: '#B19CD9' },
    { name: 'Romance', icon: 'heart', color: '#FFB6C1' },
    { name: 'Mystery', icon: 'search-circle', color: '#6C5CE7' },
    { name: 'Self-Help', icon: 'bulb', color: '#FDB777' },
    { name: 'Children', icon: 'happy', color: '#F7DC6F' },
  ];

  /**
   * Load recent listings
   */
  useEffect(() => {
    loadRecentListings();
  }, []);

  const loadRecentListings = async () => {
    try {
      setIsLoading(true);

      // Try to get location
      let location: { latitude: number; longitude: number } | null = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const currentLocation = await Location.getCurrentPositionAsync({});
          location = {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          };
        }
      } catch (error) {
        console.log('Location not available');
      }

      // Fetch recent listings (with location if available)
      const searchParams: any = {
        searchType: location ? 'location' : 'text',
        status: 'available',
        limit: 20,
      };

      if (location) {
        searchParams.latitude = location.latitude;
        searchParams.longitude = location.longitude;
        searchParams.radius = 50000; // 50km
      }

      const response = await listingsService.searchListings(searchParams);
      setRecentListings(response.data);
    } catch (error) {
      console.error('Failed to load listings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Navigate to category search
   */
  const handleCategoryPress = (category: string) => {
    router.push({
      pathname: '/search',
      params: { category },
    });
  };

  /**
   * Navigate to search
   */
  const handleSearch = () => {
    router.push('/search');
  };

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
   * Render category card
   */
  const renderCategory = (category: Category) => (
    <TouchableOpacity
      key={category.name}
      onPress={() => handleCategoryPress(category.name)}
      style={styles.categoryCard}
    >
      <GlassCard variant="md" padding="md">
        <View
          style={[
            styles.categoryIcon,
            { backgroundColor: category.color },
          ]}
        >
          <Ionicons name={category.icon} size={28} color="#FFFFFF" />
        </View>
        <Text style={[styles.categoryName, { color: colors.text }]}>
          {category.name}
        </Text>
      </GlassCard>
    </TouchableOpacity>
  );

  /**
   * Render listing item (horizontal)
   */
  const renderListing = ({ item }: { item: Listing }) => (
    <View style={styles.listingCardWrapper}>
      <BookCard
        title={item.book.title}
        author={item.book.author}
        coverImage={item.book.coverImageUrl}
        condition={item.condition}
        listingType={item.listingType}
        distance={item.distance}
        onPress={() => handleListingPress(item)}
      />
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
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Explore Books
            </Text>

            {/* Search Bar */}
            <TouchableOpacity
              onPress={handleSearch}
              style={[styles.searchBar, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="search" size={20} color={colors.textSecondary} />
              <Text style={[styles.searchPlaceholder, { color: colors.textSecondary }]}>
                Search by title, author, ISBN...
              </Text>
            </TouchableOpacity>
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Browse by Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {categories.map(renderCategory)}
            </ScrollView>
          </View>

          {/* Recent Listings */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Recent Listings
              </Text>
              <TouchableOpacity onPress={loadRecentListings}>
                <Ionicons
                  name="refresh"
                  size={20}
                  color={BookLoopColors.burntOrange}
                />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <GlassCard variant="lg" padding="xl">
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Loading listings...
                </Text>
              </GlassCard>
            ) : recentListings.length > 0 ? (
              <FlatList
                data={recentListings}
                renderItem={renderListing}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listingsContainer}
                scrollEnabled={false}
              />
            ) : (
              <GlassCard variant="lg" padding="xl">
                <View style={styles.emptyContent}>
                  <Ionicons
                    name="book-outline"
                    size={48}
                    color={colors.textSecondary}
                    style={styles.emptyIcon}
                  />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No listings available yet
                  </Text>
                </View>
              </GlassCard>
            )}
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
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
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.heading,
  },
  categoriesContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  categoryCard: {
    width: CATEGORY_CARD_WIDTH,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
  listingsContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  listingCardWrapper: {
    marginBottom: Spacing.sm,
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: Spacing.md,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
  },
});
