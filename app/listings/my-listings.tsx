/**
 * My Listings Screen
 *
 * View and manage user's book listings.
 *
 * Features:
 * - View all user listings
 * - Filter by status (available, pending, exchanged, unavailable)
 * - Edit listings
 * - Delete listings
 * - Mark as unavailable/reactivate
 * - Quick create listing button
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard, GlassButton, BookCard } from '@/components/ui';
import { listingsService, Listing } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';

type StatusFilter = 'all' | 'available' | 'pending' | 'exchanged' | 'unavailable';

export default function MyListingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const statusFilters: Array<{
    value: StatusFilter;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }> = [
    { value: 'all', label: 'All', icon: 'apps' },
    { value: 'available', label: 'Available', icon: 'checkmark-circle' },
    { value: 'pending', label: 'Pending', icon: 'time' },
    { value: 'exchanged', label: 'Exchanged', icon: 'swap-horizontal' },
    { value: 'unavailable', label: 'Unavailable', icon: 'close-circle' },
  ];

  /**
   * Load listings on focus
   */
  useFocusEffect(
    useCallback(() => {
      loadListings();
    }, [])
  );

  /**
   * Load user's listings
   */
  const loadListings = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const data = await listingsService.getMyListings();
      setListings(data);
      filterListings(data, statusFilter);
    } catch (error) {
      console.error('Failed to load listings:', error);
      Alert.alert('Error', 'Failed to load your listings');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  /**
   * Filter listings by status
   */
  const filterListings = (
    listingsData: Listing[],
    filter: StatusFilter
  ) => {
    if (filter === 'all') {
      setFilteredListings(listingsData);
    } else {
      setFilteredListings(
        listingsData.filter((listing) => listing.status === filter)
      );
    }
  };

  /**
   * Handle status filter change
   */
  const handleFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
    filterListings(listings, filter);
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
   * Show listing options menu
   */
  const showListingOptions = (listing: Listing) => {
    const options = [
      'View',
      'Edit',
      listing.status === 'available' ? 'Mark as Unavailable' : 'Reactivate',
      'Delete',
      'Cancel',
    ];

    const destructiveButtonIndex = 3;
    const cancelButtonIndex = 4;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex,
          cancelButtonIndex,
        },
        (buttonIndex) => {
          handleOptionSelected(listing, buttonIndex);
        }
      );
    } else {
      // Android: Show alert dialog
      Alert.alert('Listing Options', 'Choose an action', [
        { text: 'View', onPress: () => handleOptionSelected(listing, 0) },
        { text: 'Edit', onPress: () => handleOptionSelected(listing, 1) },
        {
          text: listing.status === 'available' ? 'Mark as Unavailable' : 'Reactivate',
          onPress: () => handleOptionSelected(listing, 2),
        },
        {
          text: 'Delete',
          onPress: () => handleOptionSelected(listing, 3),
          style: 'destructive',
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  /**
   * Handle option selected from menu
   */
  const handleOptionSelected = async (listing: Listing, index: number) => {
    switch (index) {
      case 0: // View
        handleListingPress(listing);
        break;

      case 1: // Edit
        router.push({
          pathname: '/listing/edit/[id]',
          params: { id: listing.id },
        });
        break;

      case 2: // Toggle availability
        await toggleAvailability(listing);
        break;

      case 3: // Delete
        confirmDelete(listing);
        break;

      default:
        break;
    }
  };

  /**
   * Toggle listing availability
   */
  const toggleAvailability = async (listing: Listing) => {
    try {
      if (listing.status === 'available') {
        await listingsService.markAsUnavailable(listing.id);
        Alert.alert('Success', 'Listing marked as unavailable');
      } else {
        await listingsService.reactivateListing(listing.id);
        Alert.alert('Success', 'Listing reactivated');
      }
      loadListings(true);
    } catch (error) {
      console.error('Failed to toggle availability:', error);
      Alert.alert('Error', 'Failed to update listing');
    }
  };

  /**
   * Confirm deletion
   */
  const confirmDelete = (listing: Listing) => {
    Alert.alert(
      'Delete Listing',
      `Are you sure you want to delete "${listing.book.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteListing(listing),
        },
      ]
    );
  };

  /**
   * Delete listing
   */
  const deleteListing = async (listing: Listing) => {
    try {
      await listingsService.deleteListing(listing.id);
      Alert.alert('Success', 'Listing deleted');
      loadListings(true);
    } catch (error) {
      console.error('Failed to delete listing:', error);
      Alert.alert('Error', 'Failed to delete listing');
    }
  };

  /**
   * Navigate to create listing
   */
  const handleCreateListing = () => {
    router.push('/listing/create');
  };

  /**
   * Render listing item
   */
  const renderListing = ({ item }: { item: Listing }) => (
    <View style={styles.listingWrapper}>
      <BookCard
        title={item.book.title}
        author={item.book.author}
        coverImage={item.book.coverImageUrl}
        condition={item.condition}
        listingType={item.listingType}
        onPress={() => handleListingPress(item)}
      />

      {/* Status Badge */}
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor: getStatusColor(item.status),
          },
        ]}
      >
        <Text style={styles.statusText}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Text>
      </View>

      {/* Options Button */}
      <TouchableOpacity
        onPress={() => showListingOptions(item)}
        style={[styles.optionsButton, { backgroundColor: colors.surface }]}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
      </TouchableOpacity>
    </View>
  );

  /**
   * Get status color
   */
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      available: '#34C759',
      pending: '#FF9500',
      exchanged: '#007AFF',
      unavailable: '#8E8E93',
    };
    return colors[status] || '#8E8E93';
  };

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
            No Listings Yet
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
            Start sharing your books with the community
          </Text>
          <GlassButton
            title="Create Your First Listing"
            onPress={handleCreateListing}
            variant="primary"
            size="md"
            icon="add-circle"
            style={styles.emptyButton}
          />
        </View>
      </GlassCard>
    </View>
  );

  /**
   * Render header with filters
   */
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.statsContainer}>
        <GlassCard variant="md" padding="md">
          <Text style={[styles.statValue, { color: colors.text }]}>
            {listings.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Total Listings
          </Text>
        </GlassCard>

        <GlassCard variant="md" padding="md">
          <Text style={[styles.statValue, { color: colors.text }]}>
            {listings.filter((l) => l.status === 'available').length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Available
          </Text>
        </GlassCard>

        <GlassCard variant="md" padding="md">
          <Text style={[styles.statValue, { color: colors.text }]}>
            {listings.filter((l) => l.status === 'exchanged').length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Exchanged
          </Text>
        </GlassCard>
      </View>

      {/* Status Filters */}
      <View style={styles.filtersContainer}>
        {statusFilters.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            onPress={() => handleFilterChange(filter.value)}
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  statusFilter === filter.value
                    ? BookLoopColors.burntOrange
                    : colors.surface,
              },
            ]}
          >
            <Ionicons
              name={filter.icon}
              size={16}
              color={statusFilter === filter.value ? '#FFFFFF' : colors.text}
            />
            <Text
              style={[
                styles.filterText,
                {
                  color: statusFilter === filter.value ? '#FFFFFF' : colors.text,
                },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Listings',
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity
              onPress={handleCreateListing}
              style={styles.headerButton}
            >
              <Ionicons
                name="add-circle"
                size={28}
                color={BookLoopColors.burntOrange}
              />
            </TouchableOpacity>
          ),
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

        <SafeAreaView style={styles.safeArea}>
          <FlatList
            data={filteredListings}
            renderItem={renderListing}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={listings.length > 0 ? renderHeader : null}
            ListEmptyComponent={!isLoading ? renderEmpty : null}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => loadListings(true)}
                tintColor={BookLoopColors.burntOrange}
              />
            }
          />
        </SafeAreaView>
      </View>
    </>
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
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statValue: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  filterChip: {
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
  listingWrapper: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  statusBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  optionsButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    marginTop: Spacing.md,
  },
  headerButton: {
    marginRight: Spacing.md,
  },
});
