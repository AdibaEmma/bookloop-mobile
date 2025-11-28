/**
 * Exchange Request Screen
 *
 * Request to exchange a book with another user.
 *
 * Features:
 * - View book details
 * - Select meetup location
 * - Add message to owner
 * - Submit exchange request
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { GlassCard, GlassButton, GlassInput, Avatar } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { listingsService, exchangesService, meetupSpotsService, Listing, MeetupSpot as ApiMeetupSpot } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';

interface MeetupSpot {
  id: string;
  name: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  distance?: number;
}

export default function ExchangeRequestScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [message, setMessage] = useState('');
  const [selectedMeetupSpot, setSelectedMeetupSpot] = useState<MeetupSpot | null>(null);
  const [meetupSpots, setMeetupSpots] = useState<MeetupSpot[]>([]);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  /**
   * Load listing and meetup spots
   */
  useEffect(() => {
    loadData();
  }, [listingId]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load listing
      const listingData = await listingsService.getListingById(listingId);
      setListing(listingData);

      // Get user location
      const location = await getUserLocation();
      setUserLocation(location);

      // Load nearby meetup spots from API
      let spotsData: ApiMeetupSpot[] = [];
      if (location) {
        // Get spots near user location
        const response = await meetupSpotsService.search({
          latitude: location.latitude,
          longitude: location.longitude,
          radius: 10, // 10km radius
          limit: 10,
        });
        spotsData = response.data;
      } else {
        // Fallback to popular spots in Accra
        const response = await meetupSpotsService.getPopular('Accra', 10);
        spotsData = response.data;
      }

      // Convert API spots to local format
      const formattedSpots: MeetupSpot[] = spotsData.map((spot) => {
        // Parse PostGIS POINT format: "POINT(longitude latitude)"
        const match = spot.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
        const longitude = match ? parseFloat(match[1]) : 0;
        const latitude = match ? parseFloat(match[2]) : 0;

        return {
          id: spot.id,
          name: spot.name,
          description: spot.description,
          address: spot.address,
          latitude,
          longitude,
        };
      });

      setMeetupSpots(formattedSpots);
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load listing details');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get user location
   */
  const getUserLocation = async (): Promise<{
    latitude: number;
    longitude: number;
  } | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Location error:', error);
      return null;
    }
  };

  /**
   * Format distance
   */
  const formatDistance = (meters?: number): string => {
    if (!meters) return '';
    if (meters < 1000) return `${Math.round(meters)}m away`;
    return `${(meters / 1000).toFixed(1)}km away`;
  };

  /**
   * Validate form
   */
  const validateForm = (): boolean => {
    if (!selectedMeetupSpot) {
      Alert.alert('Meetup Location Required', 'Please select a meetup location');
      return false;
    }

    if (!message.trim()) {
      Alert.alert('Message Required', 'Please add a message for the book owner');
      return false;
    }

    return true;
  };

  /**
   * Submit exchange request
   */
  const handleSubmit = async () => {
    if (!validateForm() || !listing || !selectedMeetupSpot) return;

    try {
      setIsSubmitting(true);

      // Create exchange request
      await exchangesService.createExchange({
        listingId: listing.id,
        message: message.trim(),
        meetupLocationId: selectedMeetupSpot.id,
      });

      // Increment meetup spot usage count
      await meetupSpotsService.incrementUsage(selectedMeetupSpot.id);

      Alert.alert(
        'Request Sent!',
        'Your exchange request has been sent to the book owner.',
        [
          {
            text: 'View My Requests',
            onPress: () => router.push('/exchange/my-exchanges'),
          },
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to create exchange:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to send exchange request'
      );
    } finally {
      setIsSubmitting(false);
    }
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
    return null;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Request Exchange',
          headerShown: true,
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
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Book Info */}
          <GlassCard variant="lg" padding="lg">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Book Details
            </Text>

            <View style={styles.bookInfo}>
              <Image
                source={{
                  uri: listing.book.coverImage || 'https://via.placeholder.com/80x120',
                }}
                style={styles.bookCover}
              />

              <View style={styles.bookDetails}>
                <Text style={[styles.bookTitle, { color: colors.text }]}>
                  {listing.book.title}
                </Text>
                <Text style={[styles.bookAuthor, { color: colors.textSecondary }]}>
                  by {listing.book.author}
                </Text>

                <View style={styles.ownerInfo}>
                  <Avatar
                    imageUrl={listing.user.avatarUrl}
                    name={`${listing.user.firstName} ${listing.user.lastName}`}
                    size="sm"
                  />
                  <Text style={[styles.ownerName, { color: colors.textSecondary }]}>
                    {listing.user.firstName} {listing.user.lastName}
                  </Text>
                </View>
              </View>
            </View>
          </GlassCard>

          {/* Meetup Location */}
          <GlassCard variant="lg" padding="lg">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Select Meetup Location *
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Choose a public place to meet and exchange books
            </Text>

            <View style={styles.meetupSpotsContainer}>
              {meetupSpots.map((spot) => (
                <TouchableOpacity
                  key={spot.id}
                  onPress={() => setSelectedMeetupSpot(spot)}
                  style={[
                    styles.meetupSpotCard,
                    {
                      backgroundColor:
                        selectedMeetupSpot?.id === spot.id
                          ? BookLoopColors.burntOrange
                          : colors.surface,
                    },
                  ]}
                >
                  <View style={styles.meetupSpotHeader}>
                    <Ionicons
                      name={
                        selectedMeetupSpot?.id === spot.id
                          ? 'checkmark-circle'
                          : 'location'
                      }
                      size={24}
                      color={
                        selectedMeetupSpot?.id === spot.id ? '#FFFFFF' : colors.text
                      }
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.meetupSpotName,
                          {
                            color:
                              selectedMeetupSpot?.id === spot.id
                                ? '#FFFFFF'
                                : colors.text,
                          },
                        ]}
                      >
                        {spot.name}
                      </Text>
                      <Text
                        style={[
                          styles.meetupSpotDistance,
                          {
                            color:
                              selectedMeetupSpot?.id === spot.id
                                ? 'rgba(255, 255, 255, 0.8)'
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        {formatDistance(spot.distance)}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.meetupSpotAddress,
                      {
                        color:
                          selectedMeetupSpot?.id === spot.id
                            ? 'rgba(255, 255, 255, 0.9)'
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {spot.address}
                  </Text>

                  {spot.description && (
                    <Text
                      style={[
                        styles.meetupSpotDescription,
                        {
                          color:
                            selectedMeetupSpot?.id === spot.id
                              ? 'rgba(255, 255, 255, 0.8)'
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {spot.description}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>

          {/* Message */}
          <GlassCard variant="lg" padding="lg">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Message to Owner *
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Introduce yourself and let them know why you're interested
            </Text>

            <GlassInput
              value={message}
              onChangeText={setMessage}
              placeholder="Hi! I'm interested in exchanging this book..."
              multiline
              numberOfLines={6}
              style={{ height: 120 }}
            />
          </GlassCard>

          {/* Submit Button */}
          <GlassButton
            title="Send Request"
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            loading={isSubmitting}
            disabled={isSubmitting}
            icon="send"
            style={styles.submitButton}
          />
        </ScrollView>
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
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.md,
  },
  bookInfo: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  bookCover: {
    width: 80,
    height: 120,
    borderRadius: 8,
  },
  bookDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.sm,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  ownerName: {
    fontSize: Typography.fontSize.sm,
  },
  meetupSpotsContainer: {
    gap: Spacing.sm,
  },
  meetupSpotCard: {
    padding: Spacing.md,
    borderRadius: 12,
  },
  meetupSpotHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  meetupSpotName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  meetupSpotDistance: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  meetupSpotAddress: {
    fontSize: Typography.fontSize.sm,
    marginLeft: 32,
    marginBottom: 4,
  },
  meetupSpotDescription: {
    fontSize: Typography.fontSize.xs,
    marginLeft: 32,
    fontStyle: 'italic',
  },
  submitButton: {
    marginBottom: Spacing['2xl'],
  },
});
