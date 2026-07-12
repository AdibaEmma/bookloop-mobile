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
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassButton, GlassModal, EmptyState, ConfirmModal, OptionsSheet } from '@/components/ui';
import { BookCover } from '@/components/ui/BookCover';
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
  ConditionBadge,
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
  const [optionsTarget, setOptionsTarget] = useState<Listing | null>(null);

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
   * Show listing options — themed bottom sheet on both platforms.
   */
  const showListingOptions = (listing: Listing) => {
    setOptionsTarget(listing);
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
  const renderListing = ({ item }: { item: Listing }) => {
    const cond = ConditionBadge[item.condition] ?? ConditionBadge.good;
    const condTone = cond[colorScheme];
    const typeIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
      exchange: 'swap-horizontal',
      donate: 'gift-outline',
      borrow: 'time-outline',
    };
    const statusColor = getStatusColor(item.status);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.85}
        onPress={() => handleListingPress(item)}
      >
        <View style={styles.cardCover}>
          <BookCover
            title={item.book.title}
            author={item.book.author}
            coverImage={item.book.coverImage}
            size="sm"
            fill
          />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
              {item.book.title}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: `${statusColor}26` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusPillText, { color: statusColor }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>

          <Text style={[styles.cardAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.book.author}
          </Text>

          <View style={styles.cardMeta}>
            <View style={[styles.condPill, { backgroundColor: condTone.bg }]}>
              <Text style={[styles.condPillText, { color: condTone.fg }]}>{cond.label}</Text>
            </View>
            <View style={styles.typeMeta}>
              <Ionicons
                name={typeIcon[item.listingType] ?? 'swap-horizontal'}
                size={13}
                color={BookLoopColors.burntOrange}
              />
              <Text style={[styles.typeMetaText, { color: colors.textSecondary }]}>
                {item.listingType.charAt(0).toUpperCase() + item.listingType.slice(1)}
              </Text>
            </View>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={() => showListingOptions(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Listing options"
            >
              <Ionicons name="ellipsis-horizontal" size={19} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
                  styles.statusPill,
                  {
                    backgroundColor: `${getStatusColor(selectedListing.status)}26`,
                    alignSelf: 'flex-start',
                  },
                ]}
              >
                <View
                  style={[styles.statusDot, { backgroundColor: getStatusColor(selectedListing.status) }]}
                />
                <Text
                  style={[styles.statusPillText, { color: getStatusColor(selectedListing.status) }]}
                >
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
  const renderHeader = () => {
    const counts = {
      total: listings.length,
      available: listings.filter((l) => l.status === 'available').length,
      exchanged: listings.filter((l) => l.status === 'exchanged').length,
    };
    return (
      <View style={styles.header}>
        {/* Title + one-line shelf summary */}
        <Text style={[styles.title, { color: colors.text }]}>My Listings</Text>

        {/* Slim stat strip — three numbers on one shelf, not three slabs */}
        <View style={[styles.statStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(
            [
              { value: counts.total, label: 'On your shelf' },
              { value: counts.available, label: 'Available' },
              { value: counts.exchanged, label: 'Swapped' },
            ] as const
          ).map((stat, i) => (
            <React.Fragment key={stat.label}>
              {i > 0 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Status filters — one scrollable row, never wraps */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {statusFilters.map((filter) => {
            const on = statusFilter === filter.value;
            return (
              <TouchableOpacity
                key={filter.value}
                onPress={() => handleFilterChange(filter.value)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: on ? BookLoopColors.coffeeBrown : colors.card,
                    borderColor: on ? BookLoopColors.coffeeBrown : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={filter.icon}
                  size={14}
                  color={on ? BookLoopColors.cream : colors.textSecondary}
                />
                <Text
                  style={[styles.filterText, { color: on ? BookLoopColors.cream : colors.text }]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

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

      {/* Modals */}
      {renderViewModal()}

      <OptionsSheet
        visible={optionsTarget !== null}
        title={optionsTarget?.book.title}
        onClose={() => setOptionsTarget(null)}
        options={
          optionsTarget
            ? [
                {
                  label: 'View details',
                  icon: 'book-outline',
                  onPress: () => {
                    setSelectedListing(optionsTarget);
                    setViewModalVisible(true);
                  },
                },
                {
                  label: 'Edit listing',
                  icon: 'create-outline',
                  onPress: () =>
                    router.push({ pathname: '/listing/edit/[id]', params: { id: optionsTarget.id } }),
                },
                optionsTarget.status === 'available'
                  ? {
                      label: 'Mark as unavailable',
                      icon: 'eye-off-outline',
                      onPress: () => toggleAvailability(optionsTarget),
                    }
                  : {
                      label: 'Make available again',
                      icon: 'refresh-outline',
                      onPress: () => toggleAvailability(optionsTarget),
                    },
                {
                  label: 'Delete listing',
                  icon: 'trash-outline',
                  destructive: true,
                  onPress: () => confirmDelete(optionsTarget),
                },
              ]
            : []
        }
      />

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
    marginBottom: Spacing.sm,
  },
  // One shelf, three numbers — replaces the three heavy stat slabs.
  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 15,
    paddingVertical: 12,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 26 },
  statValue: {
    fontFamily: Typography.fontFamily.heading,
    fontSize: 19,
    fontWeight: Typography.fontWeight.bold,
  },
  statLabel: {
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
  filtersRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
  },
  filterText: {
    fontSize: 12.5,
    fontWeight: Typography.fontWeight.semibold,
  },
  // Shelf-row card: cover + facts, status as a quiet pill, options inline.
  card: {
    flexDirection: 'row',
    gap: 13,
    padding: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderRadius: 16,
  },
  cardCover: {
    width: 56,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontFamily: Typography.fontFamily.heading,
    fontSize: 14.5,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: 19,
  },
  cardAuthor: {
    fontSize: 12,
    marginTop: 2,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: Typography.fontWeight.semibold,
  },
  condPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9,
  },
  condPillText: {
    fontSize: 10.5,
    fontWeight: Typography.fontWeight.semibold,
  },
  typeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeMetaText: {
    fontSize: 11.5,
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
