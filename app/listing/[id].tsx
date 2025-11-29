/**
 * Book/Listing Detail Screen
 *
 * A visually rich, engaging listing detail page.
 *
 * Features:
 * - Hero image with gradient overlay
 * - Floating info card overlapping image
 * - Gradient accent badges
 * - Animated interactions
 * - Premium lister card
 * - Floating action button
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
  Share,
  ActivityIndicator,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Avatar } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { listingsService, Listing } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  BookLoopColors,
} from '@/constants/theme';

const { width, height } = Dimensions.get('window');
const IMAGE_HEIGHT = height * 0.5;
const CARD_OVERLAP = 60;

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const galleryRef = useRef<FlatList>(null);
  const saveAnimation = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

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

  const handleToggleSave = useCallback(() => {
    Animated.sequence([
      Animated.spring(saveAnimation, {
        toValue: 1.4,
        useNativeDriver: true,
        friction: 3,
      }),
      Animated.spring(saveAnimation, {
        toValue: 1,
        useNativeDriver: true,
        friction: 3,
      }),
    ]).start();
    setIsSaved(!isSaved);
  }, [isSaved, saveAnimation]);

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

  const handleViewProfile = () => {
    if (!listing) return;
    router.push({
      pathname: '/profile/[id]',
      params: { id: listing.userId },
    });
  };

  const handleShare = async () => {
    if (!listing) return;
    try {
      await Share.share({
        message: `Check out "${listing.book.title}" by ${listing.book.author} on BookLoop!`,
        url: `bookloop://listing/${listing.id}`,
      });
    } catch (error: any) {
      console.error('Share error:', error);
    }
  };

  const handleGalleryScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / width);
    setSelectedPhotoIndex(index);
  };

  const formatDistance = (meters?: number): string => {
    if (!meters) return '';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  const getConditionConfig = (condition: string) => {
    const configs: Record<string, { label: string; color: string; stars: number }> = {
      new: { label: 'New', color: '#10B981', stars: 5 },
      like_new: { label: 'Like New', color: '#3B82F6', stars: 4 },
      good: { label: 'Good', color: '#8B5CF6', stars: 3 },
      fair: { label: 'Fair', color: '#F59E0B', stars: 2 },
      poor: { label: 'Poor', color: '#EF4444', stars: 1 },
    };
    return configs[condition] || { label: condition, color: '#6B7280', stars: 3 };
  };

  const getListingTypeConfig = (type: string) => {
    const configs: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; gradient: string[] }> = {
      exchange: { label: 'Exchange', icon: 'swap-horizontal', gradient: [BookLoopColors.burntOrange, '#B85E2D'] },
      donate: { label: 'Free', icon: 'gift', gradient: ['#10B981', '#059669'] },
      borrow: { label: 'Borrow', icon: 'time', gradient: ['#3B82F6', '#2563EB'] },
    };
    return configs[type] || { label: type, icon: 'book', gradient: ['#6B7280', '#4B5563'] };
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      available: { label: 'Available', color: '#10B981' },
      reserved: { label: 'Reserved', color: '#F59E0B' },
      exchanged: { label: 'Exchanged', color: '#6B7280' },
      expired: { label: 'Expired', color: '#EF4444' },
      cancelled: { label: 'Cancelled', color: '#EF4444' },
      draft: { label: 'Draft', color: '#6B7280' },
    };
    return configs[status] || { label: status, color: '#6B7280' };
  };

  const renderGalleryItem = ({ item }: { item: string }) => (
    <View style={styles.galleryImageWrapper}>
      <Image
        source={{ uri: item || 'https://via.placeholder.com/300x400' }}
        style={styles.galleryImage}
        resizeMode="cover"
      />
      {/* Gradient overlay for better readability */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
        locations={[0, 0.6, 1]}
        style={styles.imageGradient}
      />
    </View>
  );

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <LinearGradient
          colors={isDark ? [BookLoopColors.deepBrown, BookLoopColors.charcoal] : [BookLoopColors.cream, BookLoopColors.lightPeach]}
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
          colors={isDark ? [BookLoopColors.deepBrown, BookLoopColors.charcoal] : [BookLoopColors.cream, BookLoopColors.lightPeach]}
          style={StyleSheet.absoluteFillObject}
        />
        <Ionicons name="book-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Listing not found
        </Text>
      </View>
    );
  }

  const photos = listing.photos && listing.photos.length > 0
    ? listing.photos
    : [listing.book.coverImage].filter(Boolean);

  const listingTypeConfig = getListingTypeConfig(listing.listingType);
  const conditionConfig = getConditionConfig(listing.condition);
  const statusConfig = getStatusConfig(listing.status);
  const isOwner = listing.userId === user?.id;
  const isAvailable = listing.status === 'available';

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerTransparent: true,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <BlurView intensity={80} tint="dark" style={styles.headerButtonBlur}>
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </BlurView>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerButtons}>
              {!isOwner && (
                <TouchableOpacity onPress={handleToggleSave} style={styles.headerButton}>
                  <BlurView intensity={80} tint="dark" style={styles.headerButtonBlur}>
                    <Animated.View style={{ transform: [{ scale: saveAnimation }] }}>
                      <Ionicons
                        name={isSaved ? 'heart' : 'heart-outline'}
                        size={22}
                        color={isSaved ? '#EF4444' : '#FFFFFF'}
                      />
                    </Animated.View>
                  </BlurView>
                </TouchableOpacity>
              )}
              {isOwner && (
                <TouchableOpacity
                  onPress={() => router.push(`/listing/edit/${listing.id}`)}
                  style={styles.headerButton}
                >
                  <BlurView intensity={80} tint="dark" style={styles.headerButtonBlur}>
                    <Ionicons name="create-outline" size={22} color="#FFFFFF" />
                  </BlurView>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
                <BlurView intensity={80} tint="dark" style={styles.headerButtonBlur}>
                  <Ionicons name="share-outline" size={22} color="#FFFFFF" />
                </BlurView>
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          bounces={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {/* Hero Image Section */}
          <View style={styles.heroSection}>
            <FlatList
              ref={galleryRef}
              data={photos}
              renderItem={renderGalleryItem}
              keyExtractor={(_, index) => index.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleGalleryScroll}
              getItemLayout={(_, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
            />

            {/* Image Counter */}
            {photos.length > 1 && (
              <View style={styles.imageCounter}>
                <BlurView intensity={60} tint="dark" style={styles.imageCounterBlur}>
                  <Ionicons name="images" size={14} color="#FFFFFF" />
                  <Text style={styles.imageCounterText}>
                    {selectedPhotoIndex + 1}/{photos.length}
                  </Text>
                </BlurView>
              </View>
            )}

            {/* Status Overlay for unavailable */}
            {!isAvailable && (
              <View style={styles.statusOverlay}>
                <BlurView intensity={90} tint="dark" style={styles.statusBadgeLarge}>
                  <Ionicons
                    name={listing.status === 'exchanged' ? 'checkmark-circle' : 'close-circle'}
                    size={24}
                    color={statusConfig.color}
                  />
                  <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </BlurView>
              </View>
            )}

            {/* Listing Type Badge - Floating on image */}
            <View style={styles.floatingTypeBadge}>
              <LinearGradient
                colors={listingTypeConfig.gradient as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.typeBadgeGradient}
              >
                <Ionicons name={listingTypeConfig.icon} size={18} color="#FFFFFF" />
                <Text style={styles.typeBadgeText}>{listingTypeConfig.label}</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Main Content Card - Overlaps image */}
          <View style={[styles.contentCard, { backgroundColor: isDark ? BookLoopColors.charcoal : '#FFFFFF' }]}>
            {/* Orange accent line */}
            <View style={styles.accentLine} />

            {/* Quick Stats Row */}
            <View style={styles.quickStats}>
              {/* Condition with stars */}
              <View style={styles.statItem}>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= conditionConfig.stars ? 'star' : 'star-outline'}
                      size={14}
                      color={star <= conditionConfig.stars ? conditionConfig.color : colors.textSecondary}
                    />
                  ))}
                </View>
                <Text style={[styles.statLabel, { color: conditionConfig.color }]}>
                  {conditionConfig.label}
                </Text>
              </View>

              {/* Divider */}
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

              {/* Distance */}
              {listing.distance ? (
                <View style={styles.statItem}>
                  <View style={styles.statIconRow}>
                    <Ionicons name="location" size={16} color={BookLoopColors.burntOrange} />
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {formatDistance(listing.distance)}
                    </Text>
                  </View>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>away</Text>
                </View>
              ) : null}

              {/* Divider */}
              {listing.distance && (
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              )}

              {/* Posted Date */}
              <View style={styles.statItem}>
                <View style={styles.statIconRow}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {formatTimeAgo(listing.createdAt)}
                  </Text>
                </View>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>posted</Text>
              </View>
            </View>

            {/* Book Title & Author */}
            <View style={styles.titleSection}>
              <Text style={[styles.bookTitle, { color: colors.text }]}>
                {listing.book.title}
              </Text>
              <Text style={[styles.bookAuthor, { color: colors.textSecondary }]}>
                by <Text style={{ color: BookLoopColors.burntOrange }}>{listing.book.author}</Text>
              </Text>
            </View>

            {/* Description */}
            {listing.description && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="document-text" size={18} color={BookLoopColors.burntOrange} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Description
                  </Text>
                </View>
                <Text
                  style={[styles.description, { color: colors.textSecondary }]}
                  numberOfLines={isDescriptionExpanded ? undefined : 3}
                >
                  {listing.description}
                </Text>
                {listing.description.length > 120 && (
                  <TouchableOpacity
                    onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    style={styles.expandButton}
                  >
                    <Text style={styles.expandButtonText}>
                      {isDescriptionExpanded ? 'Show less' : 'Read more'}
                    </Text>
                    <Ionicons
                      name={isDescriptionExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={BookLoopColors.burntOrange}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Book Details */}
            {(listing.book.publisher || listing.book.pageCount) && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="book" size={18} color={BookLoopColors.burntOrange} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Book Details
                  </Text>
                </View>
                <View style={styles.detailsGrid}>
                  {listing.book.publisher && (
                    <View style={[styles.detailCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                      <Ionicons name="business-outline" size={20} color={colors.textSecondary} />
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Publisher</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
                        {listing.book.publisher}
                      </Text>
                    </View>
                  )}
                  {listing.book.pageCount && (
                    <View style={[styles.detailCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                      <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Pages</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {listing.book.pageCount}
                      </Text>
                    </View>
                  )}
                  {listing.book.publishedDate && (
                    <View style={[styles.detailCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                      <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Published</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {listing.book.publishedDate}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Exchange Preferences */}
            {listing.listingType === 'exchange' && listing.exchangePreferences && listing.exchangePreferences.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="heart" size={18} color={BookLoopColors.burntOrange} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Books Wanted
                  </Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{listing.exchangePreferences.length}</Text>
                  </View>
                </View>
                <View style={styles.preferencesContainer}>
                  {listing.exchangePreferences.map((pref, index) => (
                    <View
                      key={pref.id}
                      style={[styles.preferenceItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                    >
                      <View style={styles.priorityBadge}>
                        <LinearGradient
                          colors={[BookLoopColors.burntOrange, '#B85E2D']}
                          style={styles.priorityGradient}
                        >
                          <Text style={styles.priorityText}>{index + 1}</Text>
                        </LinearGradient>
                      </View>
                      {pref.book.coverImage ? (
                        <Image
                          source={{ uri: pref.book.coverImage }}
                          style={styles.prefBookCover}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.prefBookCover, styles.prefBookPlaceholder]}>
                          <Ionicons name="book" size={18} color={colors.textSecondary} />
                        </View>
                      )}
                      <View style={styles.prefBookInfo}>
                        <Text style={[styles.prefBookTitle, { color: colors.text }]} numberOfLines={1}>
                          {pref.book.title}
                        </Text>
                        <Text style={[styles.prefBookAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
                          {pref.book.author}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Lister Card */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person" size={18} color={BookLoopColors.burntOrange} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Listed By
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleViewProfile}
                activeOpacity={0.8}
                style={[styles.listerCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
              >
                <LinearGradient
                  colors={[BookLoopColors.burntOrange, '#B85E2D']}
                  style={styles.listerCardAccent}
                />
                <Avatar
                  imageUrl={listing.user.avatarUrl}
                  name={`${listing.user.firstName} ${listing.user.lastName}`}
                  size="lg"
                />
                <View style={styles.listerInfo}>
                  <Text style={[styles.listerName, { color: colors.text }]}>
                    {listing.user.firstName} {listing.user.lastName}
                  </Text>
                  <View style={styles.karmaRow}>
                    <LinearGradient
                      colors={['#FFD700', '#FFA500']}
                      style={styles.karmaBadge}
                    >
                      <Ionicons name="trophy" size={12} color="#FFFFFF" />
                      <Text style={styles.karmaText}>{listing.user.karma}</Text>
                    </LinearGradient>
                    <Text style={[styles.karmaLabel, { color: colors.textSecondary }]}>Karma Points</Text>
                  </View>
                </View>
                <View style={styles.viewProfileBtn}>
                  <Ionicons name="chevron-forward" size={20} color={BookLoopColors.burntOrange} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Bottom spacing */}
            <View style={{ height: 120 }} />
          </View>
        </ScrollView>

        {/* Fixed Bottom Action */}
        <View style={styles.bottomAction}>
          <BlurView
            intensity={90}
            tint={isDark ? 'dark' : 'light'}
            style={styles.bottomBlur}
          >
            {!isOwner && isAvailable && (
              <TouchableOpacity onPress={handleRequestExchange} activeOpacity={0.9}>
                <LinearGradient
                  colors={listingTypeConfig.gradient as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButton}
                >
                  <Ionicons name={listingTypeConfig.icon} size={22} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>
                    {listing.listingType === 'exchange' ? 'Request Exchange' : listing.listingType === 'donate' ? 'Request Book' : 'Request to Borrow'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {isOwner && listing.status === 'draft' && (
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await listingsService.updateListing(listing.id, { status: 'available' });
                    loadListingDetails();
                    Alert.alert('Published!', 'Your listing is now live');
                  } catch (error) {
                    Alert.alert('Error', 'Failed to publish listing');
                  }
                }}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButton}
                >
                  <Ionicons name="globe" size={22} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Publish Listing</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {isOwner && listing.status === 'available' && (
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await listingsService.updateListing(listing.id, { status: 'draft' });
                    loadListingDetails();
                    Alert.alert('Done', 'Listing is now hidden');
                  } catch (error) {
                    Alert.alert('Error', 'Failed to update listing');
                  }
                }}
                activeOpacity={0.9}
                style={[styles.secondaryButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderColor: colors.border }]}
              >
                <Ionicons name="eye-off" size={22} color={colors.text} />
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  Mark as Unavailable
                </Text>
              </TouchableOpacity>
            )}
          </BlurView>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BookLoopColors.cream,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    marginTop: 12,
  },

  // Header
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerButtonBlur: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hero Section
  heroSection: {
    height: IMAGE_HEIGHT,
    position: 'relative',
  },
  galleryImageWrapper: {
    width: width,
    height: IMAGE_HEIGHT,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: IMAGE_HEIGHT * 0.6,
  },
  imageCounter: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    right: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageCounterBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  statusBadgeText: {
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  floatingTypeBadge: {
    position: 'absolute',
    bottom: CARD_OVERLAP + 16,
    left: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  typeBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Content Card
  contentCard: {
    marginTop: -CARD_OVERLAP,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 12,
    minHeight: height * 0.6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  accentLine: {
    width: 40,
    height: 4,
    backgroundColor: BookLoopColors.burntOrange,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },

  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 4,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 36,
  },

  // Title Section
  titleSection: {
    marginBottom: 20,
  },
  bookTitle: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  bookAuthor: {
    fontSize: 16,
    marginTop: 6,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  countBadge: {
    backgroundColor: BookLoopColors.burntOrange,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  expandButtonText: {
    color: BookLoopColors.burntOrange,
    fontSize: 14,
    fontWeight: '600',
  },

  // Details Grid
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailCard: {
    flex: 1,
    minWidth: (width - 60) / 2,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Preferences
  preferencesContainer: {
    gap: 10,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  priorityBadge: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  priorityGradient: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  prefBookCover: {
    width: 44,
    height: 60,
    borderRadius: 6,
  },
  prefBookPlaceholder: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prefBookInfo: {
    flex: 1,
  },
  prefBookTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  prefBookAuthor: {
    fontSize: 12,
    marginTop: 2,
  },

  // Lister Card
  listerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 14,
    overflow: 'hidden',
  },
  listerCardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  listerInfo: {
    flex: 1,
  },
  listerName: {
    fontSize: 16,
    fontWeight: '700',
  },
  karmaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  karmaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  karmaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  karmaLabel: {
    fontSize: 12,
  },
  viewProfileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Bottom Action
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomBlur: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    gap: 10,
    shadowColor: BookLoopColors.burntOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    gap: 10,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
