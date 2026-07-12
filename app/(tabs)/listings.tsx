/**
 * My Listings Screen (Tab)
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
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard, GlassButton, BookCard, GlassModal, EmptyState, ConfirmModal } from '@/components/ui';
import { showSuccessAlert, showErrorAlert } from '@/components/ui/AlertManager';
import { BookPlus } from 'lucide-react-native';
import { listingsService, Listing } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';

type StatusFilter = 'all' | 'available' | 'reserved' | 'exchanged' | 'unavailable';

// Filters must map to the statuses listings actually carry
// (draft/available/reserved/exchanged/expired/cancelled) — "pending" and a
// literal "unavailable" match nothing and render permanently empty lists.
const STATUS_MATCH: Record<Exclude<StatusFilter, 'all'>, (status: string) => boolean> = {
  available: (s) => s === 'available',
  reserved: (s) => s === 'reserved',
  exchanged: (s) => s === 'exchanged',
  unavailable: (s) => s === 'draft' || s === 'cancelled' || s === 'expired',
};

export default function MyListingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Derived, not state — a copy kept in state went stale when the focus
  // effect reloaded with the first render's filter captured in its closure.
  const filteredListings =
    statusFilter === 'all'
      ? listings
      : listings.filter((l) => STATUS_MATCH[statusFilter](l.status));

  // Modal states
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const statusFilters: Array<{
    value: StatusFilter;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }> = [
    { value: 'all', label: 'All', icon: 'apps' },
    { value: 'available', label: 'Available', icon: 'checkmark-circle' },
    { value: 'reserved', label: 'Reserved', icon: 'time' },
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
    } catch (error) {
      console.error('Failed to load listings:', error);
      showErrorAlert('Could not load your listings. Pull down to try again.', 'Loading failed');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  /**
   * Handle status filter change — the visible list derives from this.
   */
  const handleFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
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
        setSelectedListing(listing);
        setViewModalVisible(true);
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
        showSuccessAlert('Listing marked as unavailable');
      } else {
        await listingsService.reactivateListing(listing.id);
        showSuccessAlert('Listing reactivated');
      }
      loadListings(true);
    } catch (error) {
      console.error('Failed to toggle availability:', error);
      showErrorAlert('Could not update the listing. Please try again.', 'Update failed');
    }
  };

  /**
   * Confirm deletion via the themed modal
   */
  const confirmDelete = (listing: Listing) => {
    setDeleteTarget(listing);
  };

  /**
   * Delete listing
   */
  const deleteListing = async (listing: Listing) => {
    try {
      setIsDeleting(true);
      await listingsService.deleteListing(listing.id);
      setDeleteTarget(null);
      showSuccessAlert('Listing deleted');
      loadListings(true);
    } catch (error) {
      console.error('Failed to delete listing:', error);
      setDeleteTarget(null);
      showErrorAlert('Could not delete the listing. Please try again.', 'Delete failed');
    } finally {
      setIsDeleting(false);
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
        coverImage={item.book.coverImage}
        condition={item.condition}
        listingType={item.listingType}
        onPress={() => handleListingPress(item)}
        isOwnListing
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
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
      </TouchableOpacity>
    </View>
  );

  /**
   * Get status color
   */
  const getStatusColor = (status: string): string => {
    // Warm-palette status tones — the previous iOS system colors (incl.
    // default blue #007AFF) clashed with the book-paper design language.
    const statusColors: Record<string, string> = {
      available: BookLoopColors.success,
      reserved: BookLoopColors.warning,
      exchanged: BookLoopColors.coffeeBrown,
      draft: '#9C8B77',
      cancelled: '#9C8B77',
      expired: '#9C8B77',
    };
    return statusColors[status] || '#9C8B77';
  };

  /**
   * Render empty state
   */
  const renderEmpty = () => (
    <EmptyState
      title="No listings yet"
      body="Share a book you've finished — list it and let it find its next reader nearby."
      actionLabel="List your first book"
      actionIcon={BookPlus}
      onAction={handleCreateListing}
    />
  );


  /**
   * Render view listing modal
   */
  const renderViewModal = () => {
    if (!selectedListing) return null;

    return (
      <GlassModal
        visible={viewModalVisible}
        onClose={() => setViewModalVisible(false)}
        title={selectedListing.book.title}
        height="auto"
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.modalContent}>
            {/* Book Info */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                Author
              </Text>
              <Text style={[styles.modalValue, { color: colors.text }]}>
                {selectedListing.book.author}
              </Text>
            </View>

            {/* Condition */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                Condition
              </Text>
              <Text style={[styles.modalValue, { color: colors.text }]}>
                {selectedListing.condition?.replace('_', ' ') || 'N/A'}
              </Text>
            </View>

            {/* Type */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                Listing Type
              </Text>
              <Text style={[styles.modalValue, { color: colors.text }]}>
                {selectedListing.listingType}
              </Text>
            </View>

            {/* Description */}
            {selectedListing.description && (
              <View style={styles.modalSection}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                  Description
                </Text>
                <Text style={[styles.modalValue, { color: colors.text }]}>
                  {selectedListing.description}
                </Text>
              </View>
            )}

            {/* Status */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                Status
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: getStatusColor(selectedListing.status),
                    alignSelf: 'flex-start',
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {selectedListing.status.charAt(0).toUpperCase() + selectedListing.status.slice(1)}
                </Text>
              </View>
            </View>

            {/* Action Button */}
            <GlassButton
              title="Close"
              onPress={() => setViewModalVisible(false)}
              variant="secondary"
              size="md"
              style={{ marginTop: Spacing.lg }}
            />
          </View>
        </ScrollView>
      </GlassModal>
    );
  };


  /**
   * Render header with filters
   */
  const renderHeader = () => (
    <View style={styles.header}>
      {/* Title */}
      <Text style={[styles.title, { color: colors.text }]}>My Listings</Text>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {listings.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Total
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {listings.filter((l) => l.status === 'available').length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Available
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {listings.filter((l) => l.status === 'exchanged').length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Exchanged
          </Text>
        </View>
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
          ListHeaderComponent={renderHeader}
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

      {/* FAB - Floating Action Button (hidden when empty) */}
      {filteredListings.length > 0 && (
        <TouchableOpacity
          onPress={handleCreateListing}
          style={[styles.fab, { backgroundColor: BookLoopColors.burntOrange }]}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Modals */}
      {renderViewModal()}

      <ConfirmModal
        visible={deleteTarget !== null}
        title="Delete listing"
        message={
          deleteTarget ? `Are you sure you want to delete "${deleteTarget.book.title}"?` : undefined
        }
        confirmLabel="Delete"
        destructive
        loading={isDeleting}
        onConfirm={() => deleteTarget && deleteListing(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
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
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
    marginBottom: Spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: Spacing.md,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 80,
  },
  statValue: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'left',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    textAlign: 'left',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    zIndex: 1,
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
    zIndex: 1,
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
    alignSelf: 'center',
  },
  emptyTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  emptyDescription: {
    fontSize: Typography.fontSize.base,
    textAlign: 'left',
    marginBottom: Spacing.lg,
    alignSelf: 'stretch',
  },
  emptyButton: {
    marginTop: Spacing.md,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContent: {
    paddingBottom: Spacing.xl,
  },
  modalSection: {
    marginBottom: Spacing.lg,
  },
  modalLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalValue: {
    fontSize: Typography.fontSize.base,
    textTransform: 'capitalize',
  },
});
