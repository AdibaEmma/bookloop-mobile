/**
 * Exchange Request Screen
 *
 * Request to exchange a book with another user.
 *
 * Features:
 * - View book details
 * - Interactive map with route to meetup location
 * - Select meetup location from verified spots
 * - Date/time picker for meetup
 * - Add message to owner
 * - Submit exchange request with full meetup proposal
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GlassCard, GlassButton, GlassInput, Avatar } from '@/components/ui';
import { BookCover } from '@/components/ui/BookCover';
import { useAuth } from '@/contexts/AuthContext';
import {
  listingsService,
  exchangesService,
  meetupSpotsService,
  Listing,
  MeetupSpot as ApiMeetupSpot,
} from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
  BorderRadius,
} from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_HEIGHT = 250;

interface MeetupSpot {
  id: string;
  name: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  distance?: number;
  isVerified?: boolean;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

export default function ExchangeRequestScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const mapRef = useRef<MapView>(null);

  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [message, setMessage] = useState('');
  const [selectedMeetupSpot, setSelectedMeetupSpot] = useState<MeetupSpot | null>(null);
  const [meetupSpots, setMeetupSpots] = useState<MeetupSpot[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  // Date/time picker state
  const [meetupDate, setMeetupDate] = useState<Date>(() => {
    // Default to tomorrow at 2 PM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    return tomorrow;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Map state
  const [mapReady, setMapReady] = useState(false);

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
        const response = await meetupSpotsService.search({
          latitude: location.latitude,
          longitude: location.longitude,
          radius: 10,
          limit: 10,
        });
        spotsData = response.data;
      } else {
        const response = await meetupSpotsService.getPopular('Accra', 10);
        spotsData = response.data;
      }

      // Convert API spots to local format with distance calculation
      const formattedSpots: MeetupSpot[] = spotsData.map((spot) => {
        let longitude = 0;
        let latitude = 0;

        // MeetupSpot.location is a PostGIS POINT string, e.g. "POINT(lng lat)".
        if (typeof spot.location === 'string') {
          const match = spot.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
          if (match) {
            longitude = parseFloat(match[1]);
            latitude = parseFloat(match[2]);
          }
        }

        // Calculate distance if we have user location
        let distance: number | undefined;
        if (location && latitude && longitude) {
          distance = calculateDistance(
            location.latitude,
            location.longitude,
            latitude,
            longitude
          );
        }

        return {
          id: spot.id,
          name: spot.name,
          description: spot.description,
          address: spot.address,
          latitude,
          longitude,
          distance,
          // Curated meetup spots are inherently safe/verified public places.
          isVerified: true,
        };
      });

      // Sort by distance
      formattedSpots.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      setMeetupSpots(formattedSpots);

      // Auto-select first spot
      if (formattedSpots.length > 0) {
        setSelectedMeetupSpot(formattedSpots[0]);
      }
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
  const getUserLocation = async (): Promise<UserLocation | null> => {
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
   * Calculate distance between two points (Haversine formula)
   */
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  /**
   * Format distance
   */
  const formatDistance = (meters?: number): string => {
    if (!meters) return '';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  /**
   * Format date for display
   */
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  /**
   * Format time for display
   */
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  /**
   * Handle date change
   */
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(meetupDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setMeetupDate(newDate);
    }
  };

  /**
   * Handle time change
   */
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(meetupDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setMeetupDate(newDate);
    }
  };

  /**
   * Get map region based on user location and selected spot
   */
  const mapRegion = useMemo(() => {
    if (selectedMeetupSpot && userLocation) {
      const midLat = (userLocation.latitude + selectedMeetupSpot.latitude) / 2;
      const midLon = (userLocation.longitude + selectedMeetupSpot.longitude) / 2;
      const latDelta = Math.abs(userLocation.latitude - selectedMeetupSpot.latitude) * 1.5 + 0.01;
      const lonDelta = Math.abs(userLocation.longitude - selectedMeetupSpot.longitude) * 1.5 + 0.01;

      return {
        latitude: midLat,
        longitude: midLon,
        latitudeDelta: Math.max(latDelta, 0.02),
        longitudeDelta: Math.max(lonDelta, 0.02),
      };
    }

    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    // Default to Accra
    return {
      latitude: 5.6037,
      longitude: -0.187,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }, [userLocation, selectedMeetupSpot]);

  /**
   * Fit map to show both markers
   */
  useEffect(() => {
    if (mapReady && mapRef.current && userLocation && selectedMeetupSpot) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: userLocation.latitude, longitude: userLocation.longitude },
          { latitude: selectedMeetupSpot.latitude, longitude: selectedMeetupSpot.longitude },
        ],
        {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        }
      );
    }
  }, [mapReady, userLocation, selectedMeetupSpot]);

  /**
   * Handle meetup spot selection
   */
  const handleSpotSelect = (spot: MeetupSpot) => {
    setSelectedMeetupSpot(spot);
  };

  /**
   * Validate form
   */
  const validateForm = (): boolean => {
    if (!selectedMeetupSpot) {
      Alert.alert('Meetup Location Required', 'Please select a meetup location');
      return false;
    }

    if (meetupDate <= new Date()) {
      Alert.alert('Invalid Time', 'Please select a future date and time');
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

      // Create exchange request with meetup proposal
      await exchangesService.createExchange({
        listing_id: listing.id,
        message: message.trim() || undefined,
        proposed_meetup: {
          meetup_spot_id: selectedMeetupSpot.id,
          latitude: selectedMeetupSpot.latitude,
          longitude: selectedMeetupSpot.longitude,
          address: selectedMeetupSpot.address,
          location_name: selectedMeetupSpot.name,
        },
        proposed_meetup_time: meetupDate.toISOString(),
      });

      // Increment meetup spot usage count
      await meetupSpotsService.incrementUsage(selectedMeetupSpot.id);

      Alert.alert(
        'Request Sent!',
        `Your exchange request has been sent to the book owner with a proposed meetup at ${selectedMeetupSpot.name} on ${formatDate(meetupDate)} at ${formatTime(meetupDate)}.`,
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
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Finding best meetup spots...
        </Text>
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
        <LinearGradient
          colors={
            colorScheme === 'light'
              ? [BookLoopColors.creamTop, BookLoopColors.cream]
              : [BookLoopColors.darkBg, BookLoopColors.darkBgDeep]
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
            <View style={styles.bookInfo}>
              <View style={styles.bookCover}>
                <BookCover
                  title={listing.book?.title ?? 'Book'}
                  author={listing.book?.author}
                  coverImage={listing.book?.coverImage}
                  size="md"
                  fill
                />
              </View>

              <View style={styles.bookDetails}>
                <Text style={[styles.bookTitle, { color: colors.text }]} numberOfLines={2}>
                  {listing.book?.title}
                </Text>
                <Text style={[styles.bookAuthor, { color: colors.textSecondary }]}>
                  by {listing.book?.author}
                </Text>

                <View style={styles.ownerInfo}>
                  <Avatar
                    imageUrl={listing.user?.avatarUrl}
                    name={`${listing.user?.firstName} ${listing.user?.lastName}`}
                    size="sm"
                  />
                  <View>
                    <Text style={[styles.ownerName, { color: colors.text }]}>
                      {listing.user?.firstName} {listing.user?.lastName}
                    </Text>
                    <View style={styles.karmaRow}>
                      <Ionicons name="star" size={12} color={BookLoopColors.mutedGold} />
                      <Text style={[styles.karmaText, { color: colors.textSecondary }]}>
                        {listing.user?.karma?.toFixed(1) || '5.0'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </GlassCard>

          {/* Map with Route */}
          <GlassCard variant="lg" padding="sm">
            <Text style={[styles.sectionTitle, { color: colors.text, paddingHorizontal: Spacing.sm }]}>
              Meetup Location
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, paddingHorizontal: Spacing.sm }]}>
              Select a safe public place to meet
            </Text>

            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                initialRegion={mapRegion}
                onMapReady={() => setMapReady(true)}
                showsUserLocation
                showsMyLocationButton={false}
              >
                {/* User location marker */}
                {userLocation && (
                  <Marker
                    coordinate={userLocation}
                    title="Your Location"
                    pinColor={BookLoopColors.info}
                  >
                    <View style={styles.userMarker}>
                      <Ionicons name="person" size={16} color="#FFFFFF" />
                    </View>
                  </Marker>
                )}

                {/* Meetup spot markers */}
                {meetupSpots.map((spot) => (
                  <Marker
                    key={spot.id}
                    coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
                    title={spot.name}
                    description={spot.address}
                    pinColor={
                      selectedMeetupSpot?.id === spot.id
                        ? BookLoopColors.burntOrange
                        : BookLoopColors.coffeeBrown
                    }
                    onPress={() => handleSpotSelect(spot)}
                  >
                    <View
                      style={[
                        styles.spotMarker,
                        selectedMeetupSpot?.id === spot.id && styles.selectedSpotMarker,
                      ]}
                    >
                      <Ionicons
                        name={spot.isVerified ? 'shield-checkmark' : 'location'}
                        size={15}
                        color={BookLoopColors.deepEspresso}
                      />
                    </View>
                  </Marker>
                ))}

                {/* Route line */}
                {userLocation && selectedMeetupSpot && (
                  <Polyline
                    coordinates={[
                      userLocation,
                      { latitude: selectedMeetupSpot.latitude, longitude: selectedMeetupSpot.longitude },
                    ]}
                    strokeColor={BookLoopColors.burntOrange}
                    strokeWidth={3}
                    lineDashPattern={[10, 5]}
                  />
                )}
              </MapView>

              {/* Distance badge */}
              {selectedMeetupSpot?.distance && (
                <View style={styles.distanceBadge}>
                  <Ionicons name="navigate" size={14} color="#FFFFFF" />
                  <Text style={styles.distanceText}>
                    {formatDistance(selectedMeetupSpot.distance)}
                  </Text>
                </View>
              )}
            </View>

            {/* Spot list */}
            <View style={styles.spotListContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.spotList}
              >
                {meetupSpots.map((spot) => (
                  <TouchableOpacity
                    key={spot.id}
                    onPress={() => handleSpotSelect(spot)}
                    style={[
                      styles.spotChip,
                      {
                        backgroundColor:
                          selectedMeetupSpot?.id === spot.id
                            ? BookLoopColors.burntOrange
                            : colors.surface,
                        borderColor:
                          selectedMeetupSpot?.id === spot.id
                            ? BookLoopColors.burntOrange
                            : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={spot.isVerified ? 'shield-checkmark' : 'location'}
                      size={14}
                      color={selectedMeetupSpot?.id === spot.id ? '#FFFFFF' : colors.text}
                    />
                    <Text
                      style={[
                        styles.spotChipText,
                        {
                          color: selectedMeetupSpot?.id === spot.id ? '#FFFFFF' : colors.text,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {spot.name}
                    </Text>
                    {spot.distance && (
                      <Text
                        style={[
                          styles.spotChipDistance,
                          {
                            color:
                              selectedMeetupSpot?.id === spot.id
                                ? 'rgba(255,255,255,0.8)'
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        {formatDistance(spot.distance)}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Selected spot details */}
            {selectedMeetupSpot && (
              <View style={[styles.selectedSpotInfo, { borderTopColor: colors.border }]}>
                <View style={styles.selectedSpotHeader}>
                  <Ionicons
                    name={selectedMeetupSpot.isVerified ? 'shield-checkmark' : 'location'}
                    size={20}
                    color={BookLoopColors.burntOrange}
                  />
                  <Text style={[styles.selectedSpotName, { color: colors.text }]}>
                    {selectedMeetupSpot.name}
                  </Text>
                  {selectedMeetupSpot.isVerified && (
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.selectedSpotAddress, { color: colors.textSecondary }]}>
                  {selectedMeetupSpot.address}
                </Text>
                {selectedMeetupSpot.description && (
                  <Text style={[styles.selectedSpotDesc, { color: colors.textSecondary }]}>
                    {selectedMeetupSpot.description}
                  </Text>
                )}
              </View>
            )}
          </GlassCard>

          {/* Date & Time Selection */}
          <GlassCard variant="lg" padding="lg">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Proposed Meetup Time
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Suggest a convenient time for the exchange
            </Text>

            <View style={styles.dateTimeContainer}>
              <TouchableOpacity
                style={[styles.dateTimeButton, { backgroundColor: colors.surface }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color={BookLoopColors.burntOrange} />
                <View style={styles.dateTimeTextContainer}>
                  <Text style={[styles.dateTimeLabel, { color: colors.textSecondary }]}>
                    Date
                  </Text>
                  <Text style={[styles.dateTimeValue, { color: colors.text }]}>
                    {formatDate(meetupDate)}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateTimeButton, { backgroundColor: colors.surface }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time" size={20} color={BookLoopColors.burntOrange} />
                <View style={styles.dateTimeTextContainer}>
                  <Text style={[styles.dateTimeLabel, { color: colors.textSecondary }]}>
                    Time
                  </Text>
                  <Text style={[styles.dateTimeValue, { color: colors.text }]}>
                    {formatTime(meetupDate)}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Date Picker */}
            {showDatePicker && (
              <DateTimePicker
                value={meetupDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}

            {/* Time Picker */}
            {showTimePicker && (
              <DateTimePicker
                value={meetupDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
              />
            )}
          </GlassCard>

          {/* Message */}
          <GlassCard variant="lg" padding="lg">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Message to Owner
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Introduce yourself (optional)
            </Text>

            <GlassInput
              value={message}
              onChangeText={setMessage}
              placeholder="Hi! I'm interested in this book because..."
              multiline
              numberOfLines={4}
              style={{ minHeight: 100 }}
            />
          </GlassCard>

          {/* Summary */}
          <GlassCard variant="lg" padding="lg" style={styles.summaryCard}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              Exchange Request Summary
            </Text>

            <View style={styles.summaryRow}>
              <Ionicons name="book" size={18} color={BookLoopColors.burntOrange} />
              <Text style={[styles.summaryText, { color: colors.text }]}>
                {listing.book?.title}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Ionicons name="location" size={18} color={BookLoopColors.burntOrange} />
              <Text style={[styles.summaryText, { color: colors.text }]}>
                {selectedMeetupSpot?.name || 'Select a location'}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Ionicons name="calendar" size={18} color={BookLoopColors.burntOrange} />
              <Text style={[styles.summaryText, { color: colors.text }]}>
                {formatDate(meetupDate)} at {formatTime(meetupDate)}
              </Text>
            </View>
          </GlassCard>

          {/* Submit Button */}
          <GlassButton
            title="Send Exchange Request"
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            loading={isSubmitting}
            disabled={isSubmitting || !selectedMeetupSpot}
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
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
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
    width: 70,
    height: 105,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
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
    gap: Spacing.sm,
  },
  ownerName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  karmaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  karmaText: {
    fontSize: Typography.fontSize.xs,
  },
  mapContainer: {
    height: MAP_HEIGHT,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  map: {
    flex: 1,
  },
  userMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BookLoopColors.info,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  spotMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BookLoopColors.mutedGold,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  selectedSpotMarker: {
    backgroundColor: BookLoopColors.mutedGold,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: BookLoopColors.coffeeBrown,
  },
  distanceBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BookLoopColors.coffeeBrown,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  distanceText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  spotListContainer: {
    marginBottom: Spacing.sm,
  },
  spotList: {
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  spotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    maxWidth: 200,
  },
  spotChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    flexShrink: 1,
  },
  spotChipDistance: {
    fontSize: Typography.fontSize.xs,
  },
  selectedSpotInfo: {
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderTopWidth: 1,
  },
  selectedSpotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  selectedSpotName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    flex: 1,
  },
  verifiedBadge: {
    backgroundColor: BookLoopColors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  verifiedText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  selectedSpotAddress: {
    fontSize: Typography.fontSize.sm,
    marginBottom: 4,
  },
  selectedSpotDesc: {
    fontSize: Typography.fontSize.xs,
    fontStyle: 'italic',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  dateTimeTextContainer: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: Typography.fontSize.xs,
  },
  dateTimeValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: BookLoopColors.burntOrange,
    borderStyle: 'dashed',
  },
  summaryTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  summaryText: {
    fontSize: Typography.fontSize.sm,
    flex: 1,
  },
  submitButton: {
    marginBottom: Spacing['2xl'],
  },
});
