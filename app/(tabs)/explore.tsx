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
  // "Search wider" drops the ~50km nearby radius and pulls listings countrywide.
  const [widened, setWidened] = useState(false);

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

  // Any criterion — text, category chip, or a modal filter — puts the screen
  // in search mode. Radius alone doesn't (it only scopes an active search).
  const hasSearchCriteria =
    query.trim().length > 0 || !!selectedCategory || !!selectedCondition || !!selectedType;

  useEffect(() => {
    loadRecentListings();
  }, []);

  // Deep links (/explore?query=...) land in the search box; the effect below
  // picks the change up like any other keystroke.
  useEffect(() => {
    if (params.query) setQuery(params.query as string);
  }, [params.query]);

  // Single driver for every search trigger (typing, chips, modal filters).
  // Searching from an effect means state is committed before the request is
  // built — no stale-closure reads, no setTimeout guesswork.
  useEffect(() => {
    if (!hasSearchCriteria) {
      setSearchResults([]);
      return;
    }
    const timeoutId = setTimeout(handleSearch, 350);
    return () => clearTimeout(timeoutId);
    // handleSearch is recreated each render with fresh state; the criteria are the real deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selectedCategory, selectedCondition, selectedType, radius]);

  // One GPS fix per screen visit — repeated searches (debounced typing, chip
  // taps) reuse it instead of re-querying the hardware every time.
  const deviceLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const getDeviceLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    if (deviceLocationRef.current) return deviceLocationRef.current;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const pos = await Location.getCurrentPositionAsync({});
      deviceLocationRef.current = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
    } catch (error) {
      console.log('Location not available');
    }
    return deviceLocationRef.current;
  };

  const loadRecentListings = async (wide = false) => {
    try {
      setIsLoadingRecent(true);

      // The wide sweep is countrywide, so only the nearby view needs GPS.
      const location = wide ? null : await getDeviceLocation();

      const searchParams: any = {
        limit: wide ? 40 : 20,
      };

      // Nearby view constrains to ~50km; "wide" drops the radius for a
      // countrywide sweep.
      if (location && !wide) {
        searchParams.latitude = location.latitude;
        searchParams.longitude = location.longitude;
        searchParams.radiusMeters = 50000;
      }

      let response = await listingsService.searchListings(searchParams);
      let data: Listing[] = Array.isArray(response?.data) ? response.data : [];
      let effectiveWide = wide;

      // The grid hides the user's own listings, so judge "empty" by the same rule.
      const fromOthers = data.filter((l) => l.userId !== user?.id);
      if (!wide && fromOthers.length === 0) {
        if (location) {
          // Nothing within ~50km — widen automatically instead of dead-ending
          // on an empty screen while books exist elsewhere.
          response = await listingsService.searchListings({ limit: 40 });
          data = Array.isArray(response?.data) ? response.data : [];
        }
        // Without GPS the first query was already countrywide — just relabel.
        effectiveWide = true;
      }

      setWidened(effectiveWide);
      setRecentListings(data);
    } catch (error) {
      console.error('Failed to load listings:', error);
      showError(error, 'Failed to Load Listings');
    } finally {
      setIsLoadingRecent(false);
    }
  };

  const handleSearch = async () => {
    // Condition/type filters count as criteria too — the old guard only
    // recognised text/category, which made modal-only filtering a no-op.
    if (!hasSearchCriteria) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);

      const location = await getDeviceLocation();

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
    // The search effect reacts to this state change — no manual trigger needed.
    setSelectedCategory(selectedCategory === category ? null : category);
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
    // Filter chips update state as they're tapped, and the search effect has
    // already re-queried — closing the modal reveals the results.
    setShowFilters(false);
  };

  const handleListingPress = (listing: Listing) => {
    router.push({
      pathname: '/listing/[id]',
      params: { id: listing.id },
    });
  };

  const hasActiveFilters = selectedCategory || selectedCondition || selectedType;
  // In search mode show the search results even when empty — falling back to
  // the unfiltered browse list would make filters look ignored. Explore is for
  // discovering OTHER readers' books, so the user's own are always hidden.
  const displayListings = (hasSearchCriteria ? searchResults : recentListings).filter(
    (l) => l.userId !== user?.id,
  );
  const isShowingSearchResults = hasSearchCriteria;


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
              {isShowingSearchResults ? 'Search Results' : widened ? 'Across Ghana' : 'Near You'}
            </Text>
            {!isShowingSearchResults && (
              // Refresh retries nearby-first; loadRecentListings re-widens on its own
              // if there is still nothing close by.
              <TouchableOpacity onPress={() => loadRecentListings()} style={styles.refreshButton}>
                <Ionicons name="refresh" size={18} color={BookLoopColors.burntOrange} />
              </TouchableOpacity>
            )}
          </View>

          {!isShowingSearchResults && widened && displayListings.length > 0 && (
            <Text style={[styles.widenedNote, { color: colors.textSecondary }]}>
              Nothing within 50 km yet — showing books from farther away.
            </Text>
          )}

          {isSearching || isLoadingRecent ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={BookLoopColors.burntOrange} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                {isSearching ? 'Searching...' : 'Finding books near you...'}
              </Text>
            </View>
          ) : displayListings.length > 0 ? (
            // Wrapping row grid — rows stay aligned regardless of how tall an
            // individual card's text runs (independent columns drift apart).
            <View style={styles.gridContainer}>
              {displayListings.map((listing) => (
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
          ) : (
            <EmptyState
              title={
                isShowingSearchResults
                  ? 'No matches found'
                  : widened
                    ? 'No books shared yet'
                    : 'No books nearby yet'
              }
              body={
                isShowingSearchResults
                  ? 'Try a different title, author, or loosen your filters.'
                  : widened
                    ? 'No one has shared a book to swap yet. Be the first to list one and start the loop.'
                    : 'Books other readers share near you show up here. None close by yet — search wider, or be the first to list one.'
              }
              actionLabel={
                isShowingSearchResults ? undefined : widened ? 'List a book' : 'Search wider'
              }
              actionIcon={!isShowingSearchResults && widened ? BookPlus : undefined}
              onAction={
                isShowingSearchResults
                  ? undefined
                  : widened
                    ? () => router.push('/listing/create')
                    : () => loadRecentListings(true)
              }
              secondaryLabel={!isShowingSearchResults && !widened ? 'List a book' : undefined}
              onSecondaryAction={
                !isShowingSearchResults && !widened ? () => router.push('/listing/create') : undefined
              }
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
  widenedNote: {
    fontSize: Typography.fontSize.xs,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
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
    flexWrap: 'wrap',
    columnGap: CARD_GAP,
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
