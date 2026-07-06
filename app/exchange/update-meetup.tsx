/**
 * Update Meetup Details Screen
 *
 * Allows users to set or update meetup details for an accepted exchange.
 * Used after owner accepts the request to finalize meetup arrangements.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GlassCard, GlassButton } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import {
  exchangesService,
  meetupSpotsService,
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

const MAP_HEIGHT = 220;

interface MeetupSpot {
  id: string;
  name: string;
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

export default function UpdateMeetupScreen() {
  const { exchangeId } = useLocalSearchParams<{ exchangeId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const mapRef = useRef<MapView>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exchange, setExchange] = useState<any>(null);

  // Form state
  const [selectedMeetupSpot, setSelectedMeetupSpot] = useState<MeetupSpot | null>(null);
  const [meetupSpots, setMeetupSpots] = useState<MeetupSpot[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  // Date/time picker state
  const [meetupDate, setMeetupDate] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    return tomorrow;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    loadData();
  }, [exchangeId]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load exchange details
      const exchangeData = await exchangesService.getExchangeById(exchangeId);
      setExchange(exchangeData);

      // If exchange has existing meetup details, pre-populate
      if (exchangeData.meetupTime) {
        setMeetupDate(new Date(exchangeData.meetupTime));
      }

      // Get user location
      const location = await getUserLocation();
      setUserLocation(location);

      // Load nearby meetup spots
      await loadMeetupSpots(location);

      // If exchange has existing meetup spot, pre-select it
      if (exchangeData.meetupSpotId) {
        const existingSpot = meetupSpots.find(s => s.id === exchangeData.meetupSpotId);
        if (existingSpot) {
          setSelectedMeetupSpot(existingSpot);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load exchange details');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const loadMeetupSpots = async (location: UserLocation | null) => {
    try {
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
          address: spot.address,
          latitude,
          longitude,
          distance,
          // Curated meetup spots are inherently safe/verified public places.
          isVerified: true,
        };
      });

      formattedSpots.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      setMeetupSpots(formattedSpots);

      // Auto-select first spot if no existing selection
      if (formattedSpots.length > 0 && !selectedMeetupSpot) {
        setSelectedMeetupSpot(formattedSpots[0]);
      }
    } catch (error) {
      console.error('Failed to load meetup spots:', error);
    }
  };

  const getUserLocation = async (): Promise<UserLocation | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;

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

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371000;
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

  const formatDistance = (meters?: number): string => {
    if (!meters) return '';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

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

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(meetupDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setMeetupDate(newDate);
    }
  };

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

    return {
      latitude: 5.6037,
      longitude: -0.187,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }, [userLocation, selectedMeetupSpot]);

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

  const handleSubmit = async () => {
    if (!validateForm() || !selectedMeetupSpot) return;

    try {
      setIsSubmitting(true);

      await exchangesService.setMeetup(exchangeId, {
        meetup_spot_id: selectedMeetupSpot.id,
        latitude: selectedMeetupSpot.latitude,
        longitude: selectedMeetupSpot.longitude,
        address: selectedMeetupSpot.address,
        location_name: selectedMeetupSpot.name,
        meetup_time: meetupDate.toISOString(),
      });

      Alert.alert(
        'Meetup Updated!',
        `Meetup set for ${selectedMeetupSpot.name} on ${formatDate(meetupDate)} at ${formatTime(meetupDate)}. Don't forget to confirm the meetup details.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to update meetup:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update meetup details'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
          Loading meetup options...
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Update Meetup',
          headerShown: true,
        }}
      />

      <View style={styles.container}>
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
          {/* Info Banner */}
          <View style={[styles.infoBanner, { backgroundColor: BookLoopColors.info + '15' }]}>
            <Ionicons name="information-circle" size={20} color={BookLoopColors.info} />
            <Text style={[styles.infoBannerText, { color: colors.text }]}>
              Set or update the meetup details. Both parties must confirm after changes.
            </Text>
          </View>

          {/* Map with Location Selection */}
          <GlassCard variant="lg" padding="sm">
            <Text style={[styles.sectionTitle, { color: colors.text, paddingHorizontal: Spacing.sm }]}>
              Meetup Location
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
                    onPress={() => setSelectedMeetupSpot(spot)}
                  >
                    <View
                      style={[
                        styles.spotMarker,
                        selectedMeetupSpot?.id === spot.id && styles.selectedSpotMarker,
                      ]}
                    >
                      <Ionicons
                        name={spot.isVerified ? 'shield-checkmark' : 'location'}
                        size={16}
                        color="#FFFFFF"
                      />
                    </View>
                  </Marker>
                ))}

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

              {selectedMeetupSpot?.distance && (
                <View style={styles.distanceBadge}>
                  <Ionicons name="navigate" size={14} color="#FFFFFF" />
                  <Text style={styles.distanceText}>
                    {formatDistance(selectedMeetupSpot.distance)}
                  </Text>
                </View>
              )}
            </View>

            {/* Spot List */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.spotList}
            >
              {meetupSpots.map((spot) => (
                <TouchableOpacity
                  key={spot.id}
                  onPress={() => setSelectedMeetupSpot(spot)}
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
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedMeetupSpot && (
              <View style={[styles.selectedSpotInfo, { borderTopColor: colors.border }]}>
                <Ionicons
                  name={selectedMeetupSpot.isVerified ? 'shield-checkmark' : 'location'}
                  size={20}
                  color={BookLoopColors.burntOrange}
                />
                <View style={styles.selectedSpotText}>
                  <Text style={[styles.selectedSpotName, { color: colors.text }]}>
                    {selectedMeetupSpot.name}
                  </Text>
                  <Text style={[styles.selectedSpotAddress, { color: colors.textSecondary }]}>
                    {selectedMeetupSpot.address}
                  </Text>
                </View>
              </View>
            )}
          </GlassCard>

          {/* Date & Time Selection */}
          <GlassCard variant="lg" padding="lg">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Meetup Date & Time
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

            {showDatePicker && (
              <DateTimePicker
                value={meetupDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={meetupDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
              />
            )}
          </GlassCard>

          {/* Submit Button */}
          <GlassButton
            title="Update Meetup Details"
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            loading={isSubmitting}
            disabled={isSubmitting || !selectedMeetupSpot}
            icon="checkmark-circle"
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  infoBannerText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.md,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BookLoopColors.coffeeBrown,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  selectedSpotMarker: {
    backgroundColor: BookLoopColors.burntOrange,
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  distanceBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BookLoopColors.burntOrange,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  distanceText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  spotList: {
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  spotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    maxWidth: 180,
  },
  spotChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    flexShrink: 1,
  },
  selectedSpotInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderTopWidth: 1,
  },
  selectedSpotText: {
    flex: 1,
  },
  selectedSpotName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 2,
  },
  selectedSpotAddress: {
    fontSize: Typography.fontSize.sm,
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
  submitButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
});
