/**
 * Edit Listing Screen
 *
 * Allows users to edit their book listings.
 *
 * Features:
 * - Update listing description
 * - Change book condition
 * - Change listing type
 * - Manage photos (add/remove)
 * - Change listing status
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { GlassCard, GlassButton, ConfirmModal } from '@/components/ui';
import { BookCover } from '@/components/ui/BookCover';
import { useAuth } from '@/contexts/AuthContext';
import { listingsService, Listing } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';
import { showErrorAlert, showSuccessAlert } from '@/components/ui/AlertManager';

const { width } = Dimensions.get('window');

export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Form state
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState<'new' | 'like_new' | 'good' | 'fair' | 'poor'>('good');
  const [listingType, setListingType] = useState<'exchange' | 'donate' | 'borrow'>('exchange');
  const [photos, setPhotos] = useState<string[]>([]);
  const [status, setStatus] = useState<'draft' | 'available' | 'cancelled'>('draft');

  const conditionOptions = [
    { value: 'new', label: 'New', icon: 'sparkles', description: 'Brand new, unused' },
    { value: 'like_new', label: 'Like New', icon: 'star', description: 'Minimal signs of use' },
    { value: 'good', label: 'Good', icon: 'thumbs-up', description: 'Some wear, fully functional' },
    { value: 'fair', label: 'Fair', icon: 'hand-left', description: 'Noticeable wear' },
    { value: 'poor', label: 'Poor', icon: 'trending-down', description: 'Heavy wear, readable' },
  ] as const;

  const typeOptions = [
    {
      value: 'exchange',
      label: 'Exchange',
      icon: 'swap-horizontal',
      color: BookLoopColors.burntOrange,
      description: 'Swap for another book'
    },
    // Colors match the type coding used everywhere else (explore cards,
    // exchange badges): exchange = burntOrange, donate = success, borrow = info.
    {
      value: 'donate',
      label: 'Donate',
      icon: 'heart',
      color: BookLoopColors.success,
      description: 'Give away for free'
    },
    {
      value: 'borrow',
      label: 'Borrow',
      icon: 'time',
      color: BookLoopColors.info,
      description: 'Lend temporarily'
    },
  ] as const;

  /**
   * Load listing details
   */
  useEffect(() => {
    if (id) {
      loadListing();
    }
  }, [id]);

  /**
   * Track changes
   */
  useEffect(() => {
    if (!listing) return;

    // Determine original status for comparison
    let originalStatus: 'draft' | 'available' | 'cancelled' = 'available';
    if (listing.status === 'draft' || listing.status === 'available' || listing.status === 'cancelled') {
      originalStatus = listing.status;
    }

    const changed =
      description !== (listing.description || '') ||
      condition !== listing.condition ||
      listingType !== listing.listingType ||
      status !== originalStatus ||
      JSON.stringify(photos) !== JSON.stringify(listing.photos || []);

    setHasChanges(changed);
  }, [description, condition, listingType, status, photos, listing]);

  const loadListing = async () => {
    try {
      setIsLoading(true);
      const data = await listingsService.getListingById(id!);

      // Check if user owns this listing
      if (data.userId !== user?.id) {
        showErrorAlert('You do not have permission to edit this listing.', 'Unauthorized');
        router.back();
        return;
      }

      setListing(data);
      setDescription(data.description || '');
      setCondition(data.condition);
      setListingType(data.listingType);
      setPhotos(data.photos || []);

      // Set status - only allow draft, available, or cancelled in edit screen
      if (data.status === 'draft' || data.status === 'available' || data.status === 'cancelled') {
        setStatus(data.status);
      } else {
        // For reserved, exchanged, expired - default to available
        setStatus('available');
      }
    } catch (error: any) {
      console.error('Failed to load listing:', error);
      showErrorAlert(
        error.response?.data?.message || 'Failed to load listing',
        'Error'
      );
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Pick images from gallery
   */
  const handlePickImages = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - photos.length,
      });

      if (!result.canceled && result.assets) {
        const newPhotoUris = result.assets.map(asset => asset.uri);
        setPhotos([...photos, ...newPhotoUris]);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      showErrorAlert('Failed to pick images', 'Error');
    }
  };

  /**
   * Remove photo
   */
  const handleRemovePhoto = async (index: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  /**
   * Save changes
   */
  const handleSave = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsSaving(true);

      // Prepare update data
      const updateData: any = {
        description: description.trim() || undefined,
        condition,
        listingType,
        status,
      };

      // Update listing
      await listingsService.updateListing(id!, updateData);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccessAlert('Your listing has been updated successfully!', 'Success');

      // Navigate back
      router.back();
    } catch (error: any) {
      console.error('Failed to update listing:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showErrorAlert(
        error.response?.data?.message || 'Failed to update listing',
        'Update Failed'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <LinearGradient
          colors={
            colorScheme === 'light'
              ? [BookLoopColors.cream, BookLoopColors.lightPeach]
              : [BookLoopColors.deepBrown, BookLoopColors.charcoal]
          }
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={BookLoopColors.burntOrange} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading listing...</Text>
        </View>
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <LinearGradient
          colors={
            colorScheme === 'light'
              ? [BookLoopColors.cream, BookLoopColors.lightPeach]
              : [BookLoopColors.deepBrown, BookLoopColors.charcoal]
          }
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            Listing not found
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Background Gradient */}
      <LinearGradient
        colors={
          colorScheme === 'light'
            ? [BookLoopColors.cream, BookLoopColors.lightPeach]
            : [BookLoopColors.deepBrown, BookLoopColors.charcoal]
        }
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Custom Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Listing</Text>
            {hasChanges && (
              <View style={styles.changeIndicator}>
                <View style={styles.changeDot} />
              </View>
            )}
          </View>
          <View style={styles.headerButton} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Book Info (read-only) */}
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="book" size={20} color={BookLoopColors.burntOrange} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Book Information</Text>
            </View>
            <View style={styles.bookInfo}>
              <View style={styles.bookCover}>
                <BookCover
                  title={listing.book.title}
                  author={listing.book.author}
                  coverImage={listing.book.coverImage}
                  size="md"
                  fill
                />
              </View>
              <View style={styles.bookDetails}>
                <Text style={[styles.bookTitle, { color: colors.text }]} numberOfLines={2}>
                  {listing.book.title}
                </Text>
                <Text style={[styles.bookAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
                  by {listing.book.author}
                </Text>
                {listing.book.publishedDate && (
                  <Text style={[styles.bookMeta, { color: colors.textSecondary }]}>
                    {new Date(listing.book.publishedDate).getFullYear()}
                  </Text>
                )}
              </View>
            </View>
            <View style={[styles.infoBox, { backgroundColor: BookLoopColors.burntOrange + '15', borderColor: BookLoopColors.burntOrange + '30' }]}>
              <Ionicons name="information-circle" size={16} color={BookLoopColors.burntOrange} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Book details cannot be changed. Create a new listing for different books.
              </Text>
            </View>
          </GlassCard>

          {/* Listing Type */}
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pricetag" size={20} color={BookLoopColors.burntOrange} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Listing Type</Text>
            </View>
            <View style={styles.typeRow}>
              {typeOptions.map((option) => {
                const isSelected = listingType === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={async () => {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setListingType(option.value);
                    }}
                    style={[
                      styles.typeCard,
                      {
                        backgroundColor: isSelected ? option.color + '1F' : colors.card + '80',
                        borderColor: isSelected ? option.color : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={isSelected ? option.color : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typeCardLabel,
                        { color: isSelected ? option.color : colors.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.selectorHint, { color: colors.textSecondary }]}>
              {typeOptions.find((o) => o.value === listingType)?.description}
            </Text>
          </GlassCard>

          {/* Condition */}
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="star" size={20} color={BookLoopColors.burntOrange} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Book Condition</Text>
            </View>
            <View style={styles.condRow}>
              {conditionOptions.map((option) => {
                const on = condition === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={async () => {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCondition(option.value);
                    }}
                    style={[
                      styles.condChip,
                      {
                        backgroundColor: on ? BookLoopColors.coffeeBrown : colors.card + '80',
                        borderColor: on ? BookLoopColors.coffeeBrown : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.condChipText,
                        { color: on ? BookLoopColors.cream : colors.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.selectorHint, { color: colors.textSecondary }]}>
              {conditionOptions.find((o) => o.value === condition)?.description}
            </Text>
          </GlassCard>

          {/* Description */}
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={20} color={BookLoopColors.burntOrange} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
              <Text style={[styles.optionalBadge, { color: colors.textSecondary }]}>(Optional)</Text>
            </View>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Add details about condition, annotations, special features, etc."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={5}
              maxLength={500}
              style={[
                styles.textArea,
                {
                  color: colors.text,
                  backgroundColor: colors.card + '80',
                  borderColor: description.length > 0 ? BookLoopColors.burntOrange + '50' : colors.border,
                },
              ]}
            />
            <View style={styles.characterCount}>
              <Text style={[styles.characterCountText, { color: colors.textSecondary }]}>
                {description.length} / 500 characters
              </Text>
            </View>
          </GlassCard>

          {/* Photos */}
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="images" size={20} color={BookLoopColors.burntOrange} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Photos</Text>
              <Text style={[styles.optionalBadge, { color: colors.textSecondary }]}>
                ({photos.length}/5)
              </Text>
            </View>

            {photos.length > 0 ? (
              <View style={styles.photoGrid}>
                {photos.map((photo, index) => (
                  <View key={index} style={styles.photoItem}>
                    <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
                    <TouchableOpacity
                      onPress={() => handleRemovePhoto(index)}
                      style={styles.removePhotoButton}
                    >
                      <Ionicons name="close-circle" size={28} color={BookLoopColors.error} />
                    </TouchableOpacity>
                    <View style={styles.photoIndex}>
                      <Text style={styles.photoIndexText}>{index + 1}</Text>
                    </View>
                  </View>
                ))}

                {/* Add Photo Button in Grid */}
                {photos.length < 5 && (
                  <TouchableOpacity
                    onPress={handlePickImages}
                    style={[styles.addPhotoCard, { backgroundColor: colors.card + '80', borderColor: BookLoopColors.burntOrange + '50' }]}
                  >
                    <Ionicons name="add-circle" size={32} color={BookLoopColors.burntOrange} />
                    <Text style={[styles.addPhotoCardText, { color: BookLoopColors.burntOrange }]}>
                      Add Photo
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity
                onPress={handlePickImages}
                style={[styles.emptyPhotoState, { backgroundColor: colors.card + '80', borderColor: colors.border }]}
              >
                <Ionicons name="camera" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyPhotoText, { color: colors.text }]}>
                  Add photos of your book
                </Text>
                <Text style={[styles.emptyPhotoSubtext, { color: colors.textSecondary }]}>
                  Show the book's condition to potential readers
                </Text>
              </TouchableOpacity>
            )}
          </GlassCard>

          {/* Status */}
          <GlassCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="toggle" size={20} color={BookLoopColors.burntOrange} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Listing Status</Text>
            </View>

            {/* Show message if listing is cancelled or exchanged */}
            {listing && (listing.status === 'cancelled' || listing.status === 'exchanged') && (
              <View style={[styles.infoBox, { backgroundColor: BookLoopColors.error + '15', borderColor: BookLoopColors.error + '30', marginBottom: Spacing.md }]}>
                <Ionicons name="lock-closed" size={16} color={BookLoopColors.error} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  This listing is {listing.status}. No further changes can be made.
                </Text>
              </View>
            )}

            <View style={[styles.statusSegment, { borderColor: colors.border }]}>
              {(
                [
                  { value: 'draft', label: 'Unavailable', icon: 'eye-off-outline' },
                  { value: 'available', label: 'Published', icon: 'globe-outline' },
                ] as const
              ).map((opt) => {
                const locked = listing?.status === 'cancelled' || listing?.status === 'exchanged';
                const on = status === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    disabled={locked}
                    onPress={async () => {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setStatus(opt.value);
                    }}
                    style={[
                      styles.segmentItem,
                      on && { backgroundColor: BookLoopColors.coffeeBrown },
                      locked && { opacity: 0.5 },
                    ]}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={16}
                      color={on ? BookLoopColors.cream : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.segmentText,
                        { color: on ? BookLoopColors.cream : colors.text },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.selectorHint, { color: colors.textSecondary }]}>
              {status === 'available'
                ? 'Visible to readers nearby.'
                : 'Hidden from search — publish whenever you\u2019re ready.'}
            </Text>

            {/* Permanent cancel — deliberate, quiet, and confirmed */}
            {listing?.status !== 'cancelled' && listing?.status !== 'exchanged' && (
              <TouchableOpacity
                style={styles.cancelRow}
                activeOpacity={0.75}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowCancelConfirm(true);
                }}
              >
                <Ionicons name="trash-outline" size={16} color={BookLoopColors.error} />
                <Text style={styles.cancelRowText}>Cancel this listing permanently</Text>
              </TouchableOpacity>
            )}
          </GlassCard>

          {/* Bottom spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Bottom Action Bar */}
        <View style={[styles.bottomBar, { backgroundColor: colors.background + 'F0', borderTopColor: colors.border }]}>
          <GlassButton
            title="Discard"
            onPress={() => router.back()}
            variant="secondary"
            style={styles.cancelButton}
          />
          <GlassButton
            title={hasChanges ? "Save Changes" : "No Changes"}
            onPress={handleSave}
            variant="primary"
            loading={isSaving}
            disabled={!hasChanges}
            style={!hasChanges ? styles.saveButtonDisabled : styles.saveButton}
          />
        </View>
      </SafeAreaView>

      <ConfirmModal
        visible={showCancelConfirm}
        title="Cancel listing permanently?"
        message="This cannot be undone. The listing will be permanently cancelled and cannot be edited or published again."
        confirmLabel="Cancel permanently"
        cancelLabel="Keep listing"
        destructive
        onConfirm={() => {
          setShowCancelConfirm(false);
          setStatus('cancelled');
        }}
        onCancel={() => setShowCancelConfirm(false)}
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  changeIndicator: {
    width: 8,
    height: 8,
  },
  changeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BookLoopColors.burntOrange,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    flex: 1,
  },
  optionalBadge: {
    fontSize: Typography.fontSize.xs,
    fontStyle: 'italic',
  },
  bookInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  bookCover: {
    overflow: 'hidden',
    width: 80,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  bookDetails: {
    flex: 1,
    gap: Spacing.xs,
  },
  bookTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: 22,
  },
  bookAuthor: {
    fontSize: Typography.fontSize.base,
  },
  bookMeta: {
    fontSize: Typography.fontSize.sm,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    lineHeight: 18,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 13,
    borderWidth: 1.5,
  },
  typeCardLabel: {
    fontSize: 12.5,
    fontWeight: Typography.fontWeight.semibold,
  },
  selectorHint: {
    fontSize: 12,
    marginTop: 10,
    lineHeight: 16,
  },
  condRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  condChip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  condChipText: {
    fontSize: 12.5,
    fontWeight: Typography.fontWeight.semibold,
  },
  statusSegment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 13,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.semibold,
  },
  cancelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 44,
    marginTop: 14,
  },
  cancelRowText: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.semibold,
    color: BookLoopColors.error,
  },
  textArea: {
    minHeight: 120,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: Typography.fontSize.base,
    textAlignVertical: 'top',
  },
  characterCount: {
    alignItems: 'flex-end',
    marginTop: Spacing.xs,
  },
  characterCountText: {
    fontSize: Typography.fontSize.xs,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  photoItem: {
    width: (width - Spacing.lg * 2 - Spacing.lg * 2 - Spacing.sm * 2) / 3,
    aspectRatio: 1,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  photoIndex: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  photoIndexText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  addPhotoCard: {
    width: (width - Spacing.lg * 2 - Spacing.lg * 2 - Spacing.sm * 2) / 3,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  addPhotoCardText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  emptyPhotoState: {
    padding: Spacing.xl,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyPhotoText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  emptyPhotoSubtext: {
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 20,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
  saveButtonDisabled: {
    flex: 2,
    opacity: 0.5,
  },
  errorText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
  },
});
