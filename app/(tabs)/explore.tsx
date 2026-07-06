/**
 * Explore Screen
 *
 * Unified search and discovery experience with compact grid layout.
 *
 * Features:
 * - Text search with autocomplete
 * - Horizontal scrolling category chips
 * - Advanced filters (condition, type, radius)
 * - 2-column grid layout for listings
 * - Location-based search
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { GlassCard, GlassButton, GlassModal, CompactBookCard, EmptyState } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { BookPlus } from 'lucide-react-native';
import { listingsService, Listing } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { showError } from '@/utils/errorHandler';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
  BorderRadius,
  Shadows,
} from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = Spacing.sm;
const GRID_PADDING = Spacing.lg;

interface Category {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export default function ExploreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const categoryScrollRef = useRef<ScrollView>(null);

  // Search state
  const [query, setQuery] = useState((params.query as string) || '');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Listing[]>([]);
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [radius, setRadius] = useState('10');
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
    { value: 'new', label: 'New' },
    { value: 'like_new', label: 'Like New' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
  ];

  const listingTypes = [
    { value: 'exchange', label: 'Exchange', icon: 'swap-horizontal' },
    { value: 'donate', label: 'Donate', icon: 'gift' },
    { value: 'borrow', label: 'Borrow', icon: 'time' },
  ];

  useEffect(() => {
    loadRecentListings();
  }, []);

  useEffect(() => {
    if (params.query) {
      handleSearch();
    }
  }, [params.query]);

  useEffect(() => {
    if (query.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else if (query.trim().length === 0) {
      setSearchResults([]);
    }
  }, [query]);

  const loadRecentListings = async () => {
    try {
      setIsLoadingRecent(true);

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

      const searchParams: any = {
        limit: 20,
      };

      if (location) {
        searchParams.latitude = location.latitude;
        searchParams.longitude = location.longitude;
        searchParams.radiusMeters = 50000;
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

  const handleSearch = async () => {
    if (!query.trim() && !selectedCategory) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);

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

      const searchParams: any = {
        query: query.trim() || undefined,
        genre: selectedCategory || undefined,
        condition: selectedCondition || undefined,
        listingType: selectedType || undefined,
        limit: 50,
      };

      if (location) {
        searchParams.latitude = location.latitude;
        searchParams.longitude = location.longitude;
        searchParams.radiusMeters = parseInt(radius) * 1000;
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

  const handleCategoryPress = (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
    }
    // Trigger search after state update
    setTimeout(() => handleSearch(), 100);
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedCondition(null);
    setSelectedType(null);
    setRadius('10');
    setQuery('');
    setSearchResults([]);
  };

  const applyFilters = () => {
    setShowFilters(false);
    handleSearch();
  };

  const handleListingPress = (listing: Listing) => {
    router.push({
      pathname: '/listing/[id]',
      params: { id: listing.id },
    });
  };

  const hasActiveFilters = selectedCategory || selectedCondition || selectedType;
  // Explore is for discovering OTHER readers' books — never your own, which would
  // make it read like "my listings".
  const displayListings = (searchResults.length > 0 ? searchResults : recentListings).filter(
    (l) => l.userId !== user?.id,
  );
  const isShowingSearchResults = searchResults.length > 0 || query.trim().length > 0;

  // Split listings into two columns for grid layout
  const leftColumnListings = displayListings.filter((_, i) => i % 2 === 0);
  const rightColumnListings = displayListings.filter((_, i) => i % 2 === 1);

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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Explore</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Discover books near you
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, { backgroundColor: colors.card }]}>
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
                  : colors.card,
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

        {/* Category Chips - Horizontal Scroll */}
        <View style={styles.categoriesContainer}>
          <ScrollView
            ref={categoryScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.name}
                onPress={() => handleCategoryPress(category.name)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor:
                      selectedCategory === category.name
                        ? category.color
                        : colors.card,
                  },
                ]}
              >
                <Ionicons
                  name={category.icon}
                  size={16}
                  color={selectedCategory === category.name ? '#FFFFFF' : category.color}
                />
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color:
                        selectedCategory === category.name
                          ? '#FFFFFF'
                          : colors.text,
                    },
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Active Filters */}
        {hasActiveFilters && (
          <View style={styles.activeFilters}>
            {selectedCondition && (
              <View style={[styles.activeFilterChip, { backgroundColor: BookLoopColors.burntOrange }]}>
                <Text style={styles.activeFilterText}>{selectedCondition}</Text>
                <TouchableOpacity onPress={() => setSelectedCondition(null)}>
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
            {selectedType && (
              <View style={[styles.activeFilterChip, { backgroundColor: BookLoopColors.burntOrange }]}>
                <Text style={styles.activeFilterText}>{selectedType}</Text>
                <TouchableOpacity onPress={() => setSelectedType(null)}>
                  <Ionicons name="close" size={14} color="#FFFFFF" />
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

        {/* Results Section */}
        <View style={styles.resultsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {isShowingSearchResults ? 'Search Results' : 'Near You'}
            </Text>
            {!isShowingSearchResults && (
              <TouchableOpacity onPress={loadRecentListings} style={styles.refreshButton}>
                <Ionicons name="refresh" size={18} color={BookLoopColors.burntOrange} />
              </TouchableOpacity>
            )}
          </View>

          {isSearching || isLoadingRecent ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={BookLoopColors.burntOrange} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                {isSearching ? 'Searching...' : 'Finding books near you...'}
              </Text>
            </View>
          ) : displayListings.length > 0 ? (
            <View style={styles.gridContainer}>
              {/* Left Column */}
              <View style={styles.gridColumn}>
                {leftColumnListings.map((listing) => (
                  <CompactBookCard
                    key={listing.id}
                    title={listing.book.title}
                    author={listing.book.author}
                    coverImage={listing.book.coverImage}
                    condition={listing.condition}
                    listingType={listing.listingType}
                    distance={listing.distance}
                    onPress={() => handleListingPress(listing)}
                  />
                ))}
              </View>
              {/* Right Column */}
              <View style={styles.gridColumn}>
                {rightColumnListings.map((listing) => (
                  <CompactBookCard
                    key={listing.id}
                    title={listing.book.title}
                    author={listing.book.author}
                    coverImage={listing.book.coverImage}
                    condition={listing.condition}
                    listingType={listing.listingType}
                    distance={listing.distance}
                    onPress={() => handleListingPress(listing)}
                  />
                ))}
              </View>
            </View>
          ) : (
            <EmptyState
              title={isShowingSearchResults ? 'No matches found' : 'No books nearby yet'}
              body={
                isShowingSearchResults
                  ? 'Try a different title, author, or loosen your filters.'
                  : `Books other readers share near you show up here. None within ${radius} km yet — widen your radius, or be the first to list one and start the loop.`
              }
              actionLabel={isShowingSearchResults ? undefined : 'List a book'}
              actionIcon={BookPlus}
              onAction={isShowingSearchResults ? undefined : () => router.push('/listing/create')}
            />
          )}
        </View>

        <View style={{ height: insets.bottom + Spacing.xl }} />
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
                        selectedCondition === condition.value ? null : condition.value
                      )
                    }
                    style={[
                      styles.filterChip,
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
                        styles.filterChipText,
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
                      setSelectedType(selectedType === type.value ? null : type.value)
                    }
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor:
                          selectedType === type.value
                            ? BookLoopColors.burntOrange
                            : colors.surface,
                      },
                    ]}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={16}
                      color={selectedType === type.value ? '#FFFFFF' : colors.text}
                    />
                    <Text
                      style={[
                        styles.filterChipText,
                        {
                          color:
                            selectedType === type.value ? '#FFFFFF' : colors.text,
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
                Search Radius: {radius} km
              </Text>
              <View style={styles.radiusOptions}>
                {['5', '10', '25', '50'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRadius(r)}
                    style={[
                      styles.radiusOption,
                      {
                        backgroundColor:
                          radius === r ? BookLoopColors.burntOrange : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.radiusOptionText,
                        { color: radius === r ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {r}km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.lg,
  },
  header: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: GRID_PADDING,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    paddingVertical: Spacing.xs,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  categoriesContainer: {
    marginBottom: Spacing.md,
  },
  categoriesContent: {
    paddingHorizontal: GRID_PADDING,
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
  },
  categoryText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
    alignItems: 'center',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
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
  },
  clearFiltersText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  resultsSection: {
    paddingHorizontal: GRID_PADDING,
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
  refreshButton: {
    padding: Spacing.xs,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
  },
  gridContainer: {
    flexDirection: 'row',
    gap: CARD_GAP,
  },
  gridColumn: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    ...Shadows.sm,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyActionButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  emptyActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
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
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  filterChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  radiusOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  radiusOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  radiusOptionText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
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
