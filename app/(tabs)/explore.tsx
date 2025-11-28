/**
 * Explore Screen
 *
 * Unified search and discovery experience.
 *
 * Features:
 * - Text search with autocomplete
 * - Advanced filters (category, condition, type, radius)
 * - Sort options
 * - Category browsing
 * - Recent/popular listings
 * - Location-based search
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
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { GlassCard, GlassButton, GlassModal, BookCard } from '@/components/ui';
import { listingsService, Listing } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { showError } from '@/utils/errorHandler';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';

interface Category {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export default function ExploreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Search state
  const [query, setQuery] = useState((params.query as string) || '');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Listing[]>([]);
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [radius, setRadius] = useState('5'); // km
  const [sortBy, setSortBy] = useState<'distance' | 'recent' | 'popular'>('distance');

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

  const conditions = [
    { value: 'new', label: '✨ New', emoji: '✨' },
    { value: 'like_new', label: '🌟 Like New', emoji: '🌟' },
    { value: 'good', label: '👍 Good', emoji: '👍' },
    { value: 'fair', label: '👌 Fair', emoji: '👌' },
    { value: 'poor', label: '📖 Poor', emoji: '📖' },
  ];

  const listingTypes = [
    { value: 'exchange', label: '🔄 Exchange' },
    { value: 'donate', label: '🎁 Donate' },
    { value: 'borrow', label: '📚 Borrow' },
  ];

  /**
   * Load recent listings on mount
   */
  useEffect(() => {
    loadRecentListings();
  }, []);

  /**
   * Trigger search if query param is provided
   */
  useEffect(() => {
    if (params.query) {
      handleSearch();
    }
  }, [params.query]);

  /**
   * Automatic search when query changes (with debounce)
   */
  useEffect(() => {
    if (query.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    } else if (query.trim().length === 0) {
      // Clear search results when query is empty
      setSearchResults([]);
    }
  }, [query]);

  /**
   * Load recent listings
   */
  const loadRecentListings = async () => {
    try {
      setIsLoadingRecent(true);

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

      // Fetch recent listings
      const searchParams: any = {
        limit: 20,
      };

      if (location) {
        searchParams.latitude = location.latitude;
        searchParams.longitude = location.longitude;
        searchParams.radiusMeters = 50000; // 50km
      }

      const response = await listingsService.searchListings(searchParams);
      const data = response.data || response || [];
      setRecentListings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load listings:', error);
      showError(error, 'Failed to Load Listings');
    } finally {
      setIsLoadingRecent(false);
    }
  };

  /**
   * Perform search
   */
  const handleSearch = async () => {
    if (!query.trim() && selectedCategories.length === 0) {
      // If no query and no filters, show recent listings
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);

      // Get location for location-based search
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
        console.log('Location not available for search');
      }

      // Build search params
      const searchParams: any = {
        query: query.trim() || undefined,
        genre: selectedCategories.length > 0 ? selectedCategories[0] : undefined,
        condition: selectedCondition || undefined,
        listingType: selectedType || undefined,
        limit: 50,
      };

      if (location) {
        searchParams.latitude = location.latitude;
        searchParams.longitude = location.longitude;
        searchParams.radiusMeters = parseInt(radius) * 1000; // Convert to meters
      }

      const response = await listingsService.searchListings(searchParams);
      const data = response.data || response || [];
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Search failed:', error);
      showError(error, 'Search Failed');
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Toggle category selection
   */
  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [category], // Only allow one category for now
    );
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedCondition(null);
    setSelectedType(null);
    setRadius('5');
    setQuery('');
    setSearchResults([]);
  };

  /**
   * Apply filters and close modal
   */
  const applyFilters = () => {
    setShowFilters(false);
    handleSearch();
  };

  /**
   * Navigate to category search
   */
  const handleCategoryPress = (category: string) => {
    setSelectedCategories([category]);
    handleSearch();
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
   * Check if any filters are active
   */
  const hasActiveFilters = selectedCategories.length > 0 || selectedCondition || selectedType;

  /**
   * Render listing item
   */
  const renderListing = ({ item }: { item: Listing }) => (
    <View style={styles.listingCardWrapper}>
      <BookCard
        title={item.book.title}
        author={item.book.author}
        coverImage={item.book.coverImage}
        condition={item.condition}
        listingType={item.listingType}
        distance={item.distance}
        onPress={() => handleListingPress(item)}
      />
    </View>
  );

  // Determine what to display
  const displayListings = searchResults.length > 0 ? searchResults : recentListings;
  const isShowingSearchResults = searchResults.length > 0 || query.trim().length > 0;

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
          <Text style={[styles.title, { color: colors.text }]}>
            Explore Books
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchInputContainer, { backgroundColor: colors.surface }]}>
              <Ionicons name="search" size={20} color={colors.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by title, author, ISBN..."
                placeholderTextColor={colors.textSecondary}
                style={[styles.searchInput, { color: colors.text }]}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setShowFilters(true)}
              style={[
                styles.filterButton,
                {
                  backgroundColor: hasActiveFilters
                    ? BookLoopColors.burntOrange
                    : colors.surface,
                },
              ]}
            >
              <Ionicons
                name="options"
                size={20}
                color={hasActiveFilters ? '#FFFFFF' : colors.text}
              />
            </TouchableOpacity>
          </View>

          {/* Active Filters */}
          {hasActiveFilters && (
            <View style={styles.activeFilters}>
              {selectedCategories.map((cat) => (
                <View key={cat} style={[styles.activeFilterChip, { backgroundColor: BookLoopColors.burntOrange }]}>
                  <Text style={styles.activeFilterText}>{cat}</Text>
                  <TouchableOpacity onPress={() => toggleCategory(cat)}>
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
              {selectedCondition && (
                <View style={[styles.activeFilterChip, { backgroundColor: BookLoopColors.burntOrange }]}>
                  <Text style={styles.activeFilterText}>{selectedCondition}</Text>
                  <TouchableOpacity onPress={() => setSelectedCondition(null)}>
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
              {selectedType && (
                <View style={[styles.activeFilterChip, { backgroundColor: BookLoopColors.burntOrange }]}>
                  <Text style={styles.activeFilterText}>{selectedType}</Text>
                  <TouchableOpacity onPress={() => setSelectedType(null)}>
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
                <Text style={[styles.clearFiltersText, { color: BookLoopColors.burntOrange }]}>
                  Clear All
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Results / Recent Listings */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {isShowingSearchResults ? 'Search Results' : 'Recent Listings'}
              </Text>
              {!isShowingSearchResults && (
                <TouchableOpacity onPress={loadRecentListings}>
                  <Ionicons
                    name="refresh"
                    size={20}
                    color={BookLoopColors.burntOrange}
                  />
                </TouchableOpacity>
              )}
            </View>

            {isSearching || isLoadingRecent ? (
              <GlassCard variant="lg" padding="xl">
                <View style={styles.loadingContent}>
                  <ActivityIndicator size="large" color={BookLoopColors.burntOrange} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    {isSearching ? 'Searching...' : 'Loading listings...'}
                  </Text>
                </View>
              </GlassCard>
            ) : displayListings.length > 0 ? (
              <FlatList
                data={displayListings}
                renderItem={renderListing}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listingsContainer}
                scrollEnabled={false}
              />
            ) : (
              <GlassCard variant="lg" padding="xl">
                <View style={styles.emptyContent}>
                  <Ionicons
                    name={isShowingSearchResults ? 'search-outline' : 'book-outline'}
                    size={48}
                    color={colors.textSecondary}
                    style={styles.emptyIcon}
                  />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    {isShowingSearchResults ? 'No Results Found' : 'No Listings Available'}
                  </Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {isShowingSearchResults
                      ? 'Try adjusting your search or filters'
                      : 'Check back soon for new listings'}
                  </Text>
                </View>
              </GlassCard>
            )}
          </View>
        </ScrollView>

        {/* Filter Modal */}
        <GlassModal
          visible={showFilters}
          onClose={() => setShowFilters(false)}
          title="Filters"
        >
          <View style={styles.filterModalContent}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.filterScrollView}
              contentContainerStyle={styles.filterScrollContent}
            >
            {/* Categories */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>
                📚 Categories
              </Text>
              <View style={styles.chipContainer}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.name}
                    onPress={() => toggleCategory(category.name)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selectedCategories.includes(category.name)
                          ? BookLoopColors.burntOrange
                          : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: selectedCategories.includes(category.name)
                            ? '#FFFFFF'
                            : colors.text,
                        },
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Condition */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>
                Condition
              </Text>
              <View style={styles.chipContainer}>
                {conditions.map((condition) => (
                  <TouchableOpacity
                    key={condition.value}
                    onPress={() =>
                      setSelectedCondition(
                        selectedCondition === condition.value
                          ? null
                          : condition.value,
                      )
                    }
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          selectedCondition === condition.value
                            ? BookLoopColors.burntOrange
                            : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            selectedCondition === condition.value
                              ? '#FFFFFF'
                              : colors.text,
                        },
                      ]}
                    >
                      {condition.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Listing Type */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>
                Listing Type
              </Text>
              <View style={styles.chipContainer}>
                {listingTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    onPress={() =>
                      setSelectedType(
                        selectedType === type.value ? null : type.value,
                      )
                    }
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          selectedType === type.value
                            ? BookLoopColors.burntOrange
                            : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            selectedType === type.value
                              ? '#FFFFFF'
                              : colors.text,
                        },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Search Radius */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>
                Search Radius (km)
              </Text>
              <View style={[styles.radiusInput, { backgroundColor: colors.surface }]}>
                <TextInput
                  value={radius}
                  onChangeText={setRadius}
                  keyboardType="numeric"
                  placeholder="5"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.radiusInputText, { color: colors.text }]}
                />
              </View>
            </View>

            </ScrollView>

            {/* Actions - Fixed at bottom */}
            <View style={styles.filterActions}>
              <GlassButton
                title="Clear All"
                onPress={clearFilters}
                variant="ghost"
                size="md"
                style={{ flex: 1 }}
              />
              <GlassButton
                title="Apply"
                onPress={applyFilters}
                variant="primary"
                size="md"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </GlassModal>
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    paddingVertical: Spacing.xs,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
    gap: Spacing.xs,
  },
  activeFilterText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  clearFiltersButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    justifyContent: 'center',
  },
  clearFiltersText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  section: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.heading,
  },
  listingsContainer: {
    gap: Spacing.md,
  },
  listingCardWrapper: {
    marginBottom: Spacing.sm,
  },
  loadingContent: {
    alignItems: 'center',
    gap: Spacing.md,
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
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
  },
  filterSection: {
    marginBottom: Spacing.lg,
  },
  filterLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    gap: Spacing.xs,
  },
  chipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  radiusInput: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
  },
  radiusInputText: {
    fontSize: Typography.fontSize.base,
  },
  filterModalContent: {
    flex: 1,
  },
  filterScrollView: {
    flex: 1,
  },
  filterScrollContent: {
    paddingBottom: Spacing.md,
  },
  filterActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 94, 60, 0.2)',
  },
});
