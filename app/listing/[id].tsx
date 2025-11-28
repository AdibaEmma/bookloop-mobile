/**
 * Book/Listing Detail Screen
 *
 * Shows detailed information about a book listing.
 *
 * Features:
 * - Book information and cover
 * - Multiple book photos
 * - Lister profile with karma score
 * - Meetup location with map
 * - Distance from current location
 * - Request Exchange button
 * - Share listing
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard, GlassButton, Avatar } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { listingsService, Listing } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = 400;

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  /**
   * Load listing details
   */
  useEffect(() => {
    loadListingDetails();
  }, [id]);

  const loadListingDetails = async () => {
    try {
      setIsLoading(true);
      const data = await listingsService.getListingById(id);
      setListing(data);
    } catch (error: any) {
      console.error('Failed to load listing:', error);
      Alert.alert('Error', 'Failed to load listing details');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle request exchange
   */
  const handleRequestExchange = () => {
    if (!listing) return;

    if (listing.userId === user?.id) {
      Alert.alert('Your Listing', 'You cannot request your own listing');
      return;
    }

    router.push({
      pathname: '/exchange/request',
      params: { listingId: listing.id },
    });
  };

  /**
   * Handle view lister profile
   */
  const handleViewProfile = () => {
    if (!listing) return;
    router.push({
      pathname: '/profile/[id]',
      params: { id: listing.userId },
    });
  };

  /**
   * Handle share listing
   */
  const handleShare = async () => {
    if (!listing) return;

    try {
      await Share.share({
        message: `Check out this book on BookLoop: ${listing.book.title} by ${listing.book.author}`,
        url: `bookloop://listing/${listing.id}`,
      });
    } catch (error: any) {
      console.error('Share error:', error);
    }
  };

  /**
   * Format distance
   */
  const formatDistance = (meters?: number): string => {
    if (!meters) return 'Location not available';
    if (meters < 1000) return `${Math.round(meters)}m away`;
    return `${(meters / 1000).toFixed(1)}km away`;
  };

  /**
   * Get condition label
   */
  const getConditionLabel = (condition: string): string => {
    const labels: Record<string, string> = {
      new: 'Brand New',
      like_new: 'Like New',
      good: 'Good',
      fair: 'Fair',
      poor: 'Poor',
    };
    return labels[condition] || condition;
  };

  /**
   * Get listing type label
   */
  const getListingTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      exchange: 'Exchange',
      donate: 'Donate',
      borrow: 'Borrow',
    };
    return labels[type] || type;
  };

  /**
   * Get listing type icon
   */
  const getListingTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
      exchange: 'swap-horizontal',
      donate: 'gift',
      borrow: 'time',
    };
    return icons[type] || 'book';
  };

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <LinearGradient
          colors={
            colorScheme === 'light'
              ? [BookLoopColors.cream, BookLoopColors.lightPeach]
              : [BookLoopColors.deepBrown, BookLoopColors.charcoal]
          }
          style={StyleSheet.absoluteFillObject}
        />
        <ActivityIndicator size="large" color={BookLoopColors.burntOrange} />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <LinearGradient
          colors={
            colorScheme === 'light'
              ? [BookLoopColors.cream, BookLoopColors.lightPeach]
              : [BookLoopColors.deepBrown, BookLoopColors.charcoal]
          }
          style={StyleSheet.absoluteFillObject}
        />
        <Text style={[styles.errorText, { color: colors.text }]}>
          Listing not found
        </Text>
      </View>
    );
  }

  const photos = listing.photos && listing.photos.length > 0
    ? listing.photos
    : [listing.book.coverImage].filter(Boolean);

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerTransparent: true,
          headerRight: () => (
            <View style={styles.headerButtons}>
              {listing.userId === user?.id && (
                <TouchableOpacity
                  onPress={() => router.push(`/listing/edit/${listing.id}`)}
                  style={styles.headerButton}
                >
                  <Ionicons name="create-outline" size={24} color={colors.text} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
                <Ionicons name="share-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
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

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Book Images */}
          <View style={styles.imageContainer}>
            <Image
              source={{
                uri: photos[selectedPhotoIndex] || 'https://via.placeholder.com/300x400',
              }}
              style={styles.image}
              resizeMode="cover"
            />

            {/* Image Pagination Dots */}
            {photos.length > 1 && (
              <View style={styles.paginationContainer}>
                {photos.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSelectedPhotoIndex(index)}
                    style={[
                      styles.paginationDot,
                      selectedPhotoIndex === index && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Image Thumbnails */}
          {photos.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.thumbnailContainer}
              contentContainerStyle={styles.thumbnailContent}
            >
              {photos.map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedPhotoIndex(index)}
                  style={[
                    styles.thumbnail,
                    selectedPhotoIndex === index && styles.thumbnailActive,
                  ]}
                >
                  <Image
                    source={{ uri: photo }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.content}>
            {/* Book Info Card */}
            <GlassCard variant="lg" padding="lg">
              {/* Listing Type Badge */}
              <View style={styles.badgeContainer}>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: BookLoopColors.burntOrange },
                  ]}
                >
                  <Ionicons
                    name={getListingTypeIcon(listing.listingType)}
                    size={14}
                    color="#FFFFFF"
                  />
                  <Text style={styles.badgeText}>
                    {getListingTypeLabel(listing.listingType)}
                  </Text>
                </View>
              </View>

              {/* Title and Author */}
              <Text style={[styles.title, { color: colors.text }]}>
                {listing.book.title}
              </Text>
              <Text style={[styles.author, { color: colors.textSecondary }]}>
                by {listing.book.author}
              </Text>

              {/* Details Row */}
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Ionicons
                    name="star"
                    size={16}
                    color={BookLoopColors.burntOrange}
                  />
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    {getConditionLabel(listing.condition)}
                  </Text>
                </View>

                {listing.distance && (
                  <View style={styles.detailItem}>
                    <Ionicons
                      name="location"
                      size={16}
                      color={BookLoopColors.burntOrange}
                    />
                    <Text style={[styles.detailText, { color: colors.text }]}>
                      {formatDistance(listing.distance)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Description */}
              {listing.description && (
                <>
                  <View style={styles.divider} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Description
                  </Text>
                  <Text style={[styles.description, { color: colors.textSecondary }]}>
                    {listing.description}
                  </Text>
                </>
              )}

              {/* Book Details */}
              {(listing.book.publisher || listing.book.publishedDate || listing.book.pageCount) && (
                <>
                  <View style={styles.divider} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Book Details
                  </Text>
                  <View style={styles.bookDetails}>
                    {listing.book.publisher && (
                      <View style={styles.bookDetailRow}>
                        <Text style={[styles.bookDetailLabel, { color: colors.textSecondary }]}>
                          Publisher
                        </Text>
                        <Text style={[styles.bookDetailValue, { color: colors.text }]}>
                          {listing.book.publisher}
                        </Text>
                      </View>
                    )}
                    {listing.book.publishedDate && (
                      <View style={styles.bookDetailRow}>
                        <Text style={[styles.bookDetailLabel, { color: colors.textSecondary }]}>
                          Published
                        </Text>
                        <Text style={[styles.bookDetailValue, { color: colors.text }]}>
                          {listing.book.publishedDate}
                        </Text>
                      </View>
                    )}
                    {listing.book.pageCount && (
                      <View style={styles.bookDetailRow}>
                        <Text style={[styles.bookDetailLabel, { color: colors.textSecondary }]}>
                          Pages
                        </Text>
                        <Text style={[styles.bookDetailValue, { color: colors.text }]}>
                          {listing.book.pageCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </GlassCard>

            {/* Lister Info Card */}
            <GlassCard variant="lg" padding="lg">
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Listed By
              </Text>

              <TouchableOpacity
                onPress={handleViewProfile}
                style={styles.listerInfo}
              >
                <Avatar
                  imageUrl={listing.user.avatarUrl}
                  name={`${listing.user.firstName} ${listing.user.lastName}`}
                  size="lg"
                />

                <View style={styles.listerDetails}>
                  <Text style={[styles.listerName, { color: colors.text }]}>
                    {listing.user.firstName} {listing.user.lastName}
                  </Text>
                  <View style={styles.karmaContainer}>
                    <Ionicons
                      name="trophy"
                      size={14}
                      color={BookLoopColors.burntOrange}
                    />
                    <Text style={[styles.karmaText, { color: colors.textSecondary }]}>
                      {listing.user.karma} Karma
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </GlassCard>

            {/* Spacing for bottom button */}
            <View style={styles.bottomSpacing} />
          </View>
        </ScrollView>

        {/* Fixed Bottom Button */}
        {listing.userId !== user?.id && listing.status === 'available' && (
          <SafeAreaView style={styles.bottomContainer}>
            <View style={[styles.bottomButtonWrapper, { backgroundColor: colors.background }]}>
              <GlassButton
                title="Request Exchange"
                onPress={handleRequestExchange}
                variant="primary"
                size="lg"
                icon="swap-horizontal"
                style={styles.bottomButton}
              />
            </View>
          </SafeAreaView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: width,
    height: IMAGE_HEIGHT,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  badgeContainer: {
    marginBottom: Spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    gap: Spacing.xs,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
    marginBottom: Spacing.xs,
  },
  author: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.body,
    marginBottom: Spacing.md,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginVertical: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: Typography.fontSize.base,
    lineHeight: 24,
  },
  bookDetails: {
    gap: Spacing.sm,
  },
  bookDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookDetailLabel: {
    fontSize: Typography.fontSize.sm,
  },
  bookDetailValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  listerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  listerDetails: {
    flex: 1,
  },
  listerName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 2,
  },
  karmaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  karmaText: {
    fontSize: Typography.fontSize.sm,
  },
  bottomSpacing: {
    height: 80,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomButtonWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  bottomButton: {
    width: '100%',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerButton: {
    padding: Spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  errorText: {
    fontSize: Typography.fontSize.lg,
  },
  thumbnailContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  thumbnailContent: {
    gap: Spacing.sm,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: Spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnailActive: {
    borderColor: BookLoopColors.burntOrange,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
});
