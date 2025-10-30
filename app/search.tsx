/**
 * Search Screen
 *
 * Advanced search for books with filters.
 *
 * Features:
 * - Text search (title, author, ISBN)
 * - Category filter
 * - Condition filter
 * - Listing type filter
 * - Location-based radius
 * - Hybrid search (text + location)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { GlassCard, GlassButton, GlassInput, GlassModal, BookCard } from '@/components/ui';
import { listingsService, Listing } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';

export default function SearchScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [query, setQuery] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [radius, setRadius] = useState('5'); // km

  const categories = [
    'Fiction',
    'Non-Fiction',
    'Science',
    'History',
    'Biography',
    'Fantasy',
    'Romance',
    'Mystery',
    'Self-Help',
    'Children',
  ];

  const conditions = [
    { value: 'new', label: 'New' },
    { value: 'like_new', label: 'Like New' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
  ];

  const listingTypes = [
    { value: 'exchange', label: 'Exchange', icon: 'swap-horizontal' as const },
    { value: 'donate', label: 'Donate', icon: 'gift' as const },
    { value: 'borrow', label: 'Borrow', icon: 'time' as const },
  ];

  /**
   * Perform search
   */
  const handleSearch = async () => {
    if (!query.trim() && selectedCategories.length === 0) {
      return;
    }

    try {
      setIsLoading(true);

      // Get location for hybrid search
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
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        condition: selectedCondition || undefined,
        listingType: selectedType || undefined,
        searchType: location ? 'hybrid' : 'text',
        limit: 50,
      };

      if (location) {
        searchParams.latitude = location.latitude;
        searchParams.longitude = location.longitude;
        searchParams.radius = parseInt(radius) * 1000; // Convert to meters
      }

      const response = await listingsService.searchListings(searchParams);
      setListings(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Toggle category selection
   */
  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
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
  };

  /**
   * Navigate to listing detail
   */
  const handleListingPress = (listing: Listing) => {
    router.push({
      pathname: '/listing/[id]' as any,
      params: { id: listing.id },
    });
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
  const renderEmpty = () =>
    !isLoading && query ? (
      <View style={styles.emptyContainer}>
        <GlassCard variant="lg" padding="xl">
          <View style={styles.emptyContent}>
            <Ionicons
              name="search-outline"
              size={64}
              color={colors.textSecondary}
              style={styles.emptyIcon}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Results Found
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
              Try adjusting your search or filters
            </Text>
          </View>
        </GlassCard>
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={
          colorScheme === 'light'
            ? [BookLoopColors.cream, '#F5E6D3']
            : [BookLoopColors.deepBrown, '#1A1A1A']
        }
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Search Books</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <GlassInput
            value={query}
            onChangeText={setQuery}
            placeholder="Title, author, ISBN..."
            leftIcon="search"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />

          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            style={[
              styles.filterButton,
              {
                backgroundColor:
                  selectedCategories.length > 0 ||
                  selectedCondition ||
                  selectedType
                    ? BookLoopColors.burntOrange
                    : colors.surface,
              },
            ]}
          >
            <Ionicons
              name="options"
              size={20}
              color={
                selectedCategories.length > 0 ||
                selectedCondition ||
                selectedType
                  ? '#FFFFFF'
                  : colors.text
              }
            />
          </TouchableOpacity>
        </View>

        {/* Search Button */}
        <View style={styles.searchButtonContainer}>
          <GlassButton
            title="Search"
            onPress={handleSearch}
            variant="primary"
            size="lg"
            loading={isLoading}
            disabled={isLoading || (!query.trim() && selectedCategories.length === 0)}
          />
        </View>

        {/* Results */}
        <FlatList
          data={listings}
          renderItem={renderListing}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Filter Modal */}
        <GlassModal
          visible={showFilters}
          onClose={() => setShowFilters(false)}
          title="Filters"
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Categories */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>
                Categories
              </Text>
              <View style={styles.chipContainer}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    onPress={() => toggleCategory(category)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selectedCategories.includes(category)
                          ? BookLoopColors.burntOrange
                          : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: selectedCategories.includes(category)
                            ? '#FFFFFF'
                            : colors.text,
                        },
                      ]}
                    >
                      {category}
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
                    <Ionicons
                      name={type.icon}
                      size={16}
                      color={
                        selectedType === type.value ? '#FFFFFF' : colors.text
                      }
                    />
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
              <GlassInput
                value={radius}
                onChangeText={setRadius}
                keyboardType="numeric"
                placeholder="5"
              />
            </View>

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
                onPress={() => setShowFilters(false)}
                variant="primary"
                size="md"
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['2xl'],
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
  filterActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
});
