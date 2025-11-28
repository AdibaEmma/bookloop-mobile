/**
 * Meetup Point Selector Screen
 *
 * Map-based selector for choosing safe exchange locations.
 * Uses Expo Maps for map display with markers for:
 * - User location (blue dot)
 * - Book owner location (approximate)
 * - Verified safe meetup points (gold pins)
 *
 * Features:
 * - Interactive map with safe meetup points
 * - Bottom sheet list of nearby locations
 * - Distance calculation from both parties
 * - Operating hours display
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import type { AppleMapsMarker, GoogleMapsMarker } from 'expo-maps';
import { GlassCard, GlassButton } from '@/components/ui';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { meetupSpotsService, MeetupSpot as ApiMeetupSpot } from '@/services/api';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
  BorderRadius,
} from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.55;

interface MeetupSpot {
  id: string;
  name: string;
  type: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  distance?: number;
  operatingHours?: string;
  isVerified: boolean;
}

interface LocationCoords {
  latitude: number;
  longitude: number;
}

// Meetup spot type icons
const spotTypeIcons: Record<string, string> = {
  mall: 'storefront',
  library: 'library',
  cafe: 'cafe',
  restaurant: 'restaurant',
  park: 'leaf',
  station: 'train',
  university: 'school',
  other: 'location',
};

export default function MeetupSelectorScreen() {
  const { listingId, ownerLat, ownerLng } = useLocalSearchParams<{
    listingId: string;
    ownerLat?: string;
    ownerLng?: string;
  }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [ownerLocation, setOwnerLocation] = useState<LocationCoords | null>(null);
  const [meetupSpots, setMeetupSpots] = useState<MeetupSpot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<MeetupSpot | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 5.6037, // Accra default
    longitude: -0.187,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  /**
   * Load user location and meetup spots
   */
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Get user location
      const { status } = await Location.requestForegroundPermissionsAsync();
      let userCoords: LocationCoords | null = null;

      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        userCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setUserLocation(userCoords);
      }

      // Parse owner location if provided
      let ownerCoords: LocationCoords | null = null;
      if (ownerLat && ownerLng) {
        ownerCoords = {
          latitude: parseFloat(ownerLat),
          longitude: parseFloat(ownerLng),
        };
        setOwnerLocation(ownerCoords);
      }

      // Calculate center point for map
      const centerLat = userCoords
        ? ownerCoords
          ? (userCoords.latitude + ownerCoords.latitude) / 2
          : userCoords.latitude
        : 5.6037;
      const centerLng = userCoords
        ? ownerCoords
          ? (userCoords.longitude + ownerCoords.longitude) / 2
          : userCoords.longitude
        : -0.187;

      setMapRegion({
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      });

      // Load nearby meetup spots
      await loadMeetupSpots(userCoords || { latitude: centerLat, longitude: centerLng });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMeetupSpots = async (location: LocationCoords) => {
    try {
      const response = await meetupSpotsService.search({
        latitude: location.latitude,
        longitude: location.longitude,
        radius: 15, // 15km radius
        limit: 20,
      });

      // Convert API response to local format
      const spots: MeetupSpot[] = response.data.map((spot: ApiMeetupSpot) => {
        // Parse PostGIS POINT format
        const match = spot.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
        const longitude = match ? parseFloat(match[1]) : 0;
        const latitude = match ? parseFloat(match[2]) : 0;

        // Calculate distance from user
        const distance = userLocation
          ? calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              latitude,
              longitude
            )
          : undefined;

        return {
          id: spot.id,
          name: spot.name,
          type: spot.type || 'other',
          description: spot.description,
          address: spot.address,
          latitude,
          longitude,
          distance,
          operatingHours: spot.operatingHours,
          isVerified: spot.isVerified,
        };
      });

      // Sort by distance
      spots.sort((a, b) => (a.distance || 999) - (b.distance || 999));
      setMeetupSpots(spots);
    } catch (error) {
      console.error('Failed to load meetup spots:', error);
      // Use fallback spots for demo
      setMeetupSpots(getFallbackSpots());
    }
  };

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in km
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
   * Fallback spots for demo/offline mode
   */
  const getFallbackSpots = (): MeetupSpot[] => [
    {
      id: '1',
      name: 'Accra Mall',
      type: 'mall',
      address: 'Tetteh Quarshie, Accra',
      latitude: 5.6311,
      longitude: -0.1743,
      operatingHours: '9:00 AM - 9:00 PM',
      isVerified: true,
    },
    {
      id: '2',
      name: 'Marina Mall',
      type: 'mall',
      address: 'Community 7, Tema',
      latitude: 5.6697,
      longitude: -0.0166,
      operatingHours: '9:00 AM - 8:00 PM',
      isVerified: true,
    },
    {
      id: '3',
      name: 'University of Ghana Library',
      type: 'library',
      address: 'Legon, Accra',
      latitude: 5.6505,
      longitude: -0.1862,
      operatingHours: '8:00 AM - 6:00 PM',
      isVerified: true,
    },
    {
      id: '4',
      name: 'Vida e Caffè - Airport City',
      type: 'cafe',
      address: 'Airport City, Accra',
      latitude: 5.6059,
      longitude: -0.1712,
      operatingHours: '7:00 AM - 7:00 PM',
      isVerified: true,
    },
    {
      id: '5',
      name: 'West Hills Mall',
      type: 'mall',
      address: 'Weija, Accra',
      latitude: 5.5567,
      longitude: -0.3013,
      operatingHours: '9:00 AM - 9:00 PM',
      isVerified: true,
    },
  ];

  /**
   * Format distance for display
   */
  const formatDistance = (km?: number): string => {
    if (!km) return '';
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  /**
   * Handle spot selection
   */
  const handleSelectSpot = (spot: MeetupSpot) => {
    setSelectedSpot(spot);
    // Center map on selected spot
    setMapRegion({
      ...mapRegion,
      latitude: spot.latitude,
      longitude: spot.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  };

  /**
   * Confirm selection and proceed
   */
  const handleConfirm = () => {
    if (!selectedSpot) return;

    // Navigate to exchange request with selected spot
    router.push({
      pathname: '/exchange/request',
      params: {
        listingId,
        meetupSpotId: selectedSpot.id,
        meetupSpotName: selectedSpot.name,
      },
    });
  };

  /**
   * Build markers array for Apple Maps
   */
  const buildAppleMarkers = (): AppleMapsMarker[] => {
    const markers: AppleMapsMarker[] = [];

    // User location marker
    if (userLocation) {
      markers.push({
        id: 'user',
        coordinates: userLocation,
        title: 'You',
        tintColor: '#007AFF',
      });
    }

    // Owner location marker
    if (ownerLocation) {
      markers.push({
        id: 'owner',
        coordinates: ownerLocation,
        title: 'Book Owner',
        tintColor: BookLoopColors.coffeeBrown,
      });
    }

    // Meetup spot markers
    meetupSpots.forEach((spot) => {
      markers.push({
        id: spot.id,
        coordinates: {
          latitude: spot.latitude,
          longitude: spot.longitude,
        },
        title: spot.name,
        tintColor: selectedSpot?.id === spot.id
          ? BookLoopColors.mutedGold
          : BookLoopColors.burntOrange,
      });
    });

    return markers;
  };

  /**
   * Build markers array for Google Maps
   */
  const buildGoogleMarkers = (): GoogleMapsMarker[] => {
    const markers: GoogleMapsMarker[] = [];

    // User location marker
    if (userLocation) {
      markers.push({
        id: 'user',
        coordinates: userLocation,
        title: 'You',
        snippet: 'Your current location',
      });
    }

    // Owner location marker
    if (ownerLocation) {
      markers.push({
        id: 'owner',
        coordinates: ownerLocation,
        title: 'Book Owner',
        snippet: 'Approximate location',
      });
    }

    // Meetup spot markers
    meetupSpots.forEach((spot) => {
      markers.push({
        id: spot.id,
        coordinates: {
          latitude: spot.latitude,
          longitude: spot.longitude,
        },
        title: spot.name,
        snippet: spot.address,
      });
    });

    return markers;
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
          Finding safe meetup points nearby...
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Choose Meetup Location',
          headerShown: true,
          headerTransparent: true,
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: colors.text,
        }}
      />

      <View style={styles.container}>
        {/* Map View */}
        <View style={styles.mapContainer}>
          {Platform.OS === 'ios' ? (
            <AppleMaps.View
              style={styles.map}
              cameraPosition={{
                coordinates: {
                  latitude: mapRegion.latitude,
                  longitude: mapRegion.longitude,
                },
                zoom: 13,
              }}
              markers={buildAppleMarkers()}
              onMarkerClick={(event) => {
                const spot = meetupSpots.find(s => s.id === event.id);
                if (spot) handleSelectSpot(spot);
              }}
            />
          ) : (
            <GoogleMaps.View
              style={styles.map}
              cameraPosition={{
                coordinates: {
                  latitude: mapRegion.latitude,
                  longitude: mapRegion.longitude,
                },
                zoom: 13,
              }}
              markers={buildGoogleMarkers()}
              onMarkerClick={(event) => {
                const spot = meetupSpots.find(s => s.id === event.id);
                if (spot) handleSelectSpot(spot);
              }}
            />
          )}

          {/* Map Legend */}
          <View style={[styles.legend, { backgroundColor: colors.card }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>You</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: BookLoopColors.coffeeBrown }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Owner</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: BookLoopColors.burntOrange }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Safe Spot</Text>
            </View>
          </View>
        </View>

        {/* Bottom Sheet - Meetup Points List */}
        <View style={[styles.bottomSheet, { backgroundColor: colors.background }]}>
          <LinearGradient
            colors={
              colorScheme === 'light'
                ? [BookLoopColors.cream, BookLoopColors.lightPeach]
                : [BookLoopColors.deepBrown, BookLoopColors.charcoal]
            }
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.bottomSheetHandle} />

          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            Safe Meetup Points
          </Text>
          <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
            Choose a verified public location for your exchange
          </Text>

          <ScrollView
            style={styles.spotsList}
            showsVerticalScrollIndicator={false}
          >
            {meetupSpots.map((spot) => (
              <TouchableOpacity
                key={spot.id}
                onPress={() => handleSelectSpot(spot)}
                style={[
                  styles.spotCard,
                  {
                    backgroundColor:
                      selectedSpot?.id === spot.id
                        ? BookLoopColors.burntOrange
                        : colors.surface,
                  },
                ]}
              >
                <View style={styles.spotHeader}>
                  <View
                    style={[
                      styles.spotIcon,
                      {
                        backgroundColor:
                          selectedSpot?.id === spot.id
                            ? 'rgba(255,255,255,0.2)'
                            : colors.background,
                      },
                    ]}
                  >
                    <Ionicons
                      name={spotTypeIcons[spot.type] as any || 'location'}
                      size={20}
                      color={
                        selectedSpot?.id === spot.id
                          ? '#FFFFFF'
                          : BookLoopColors.coffeeBrown
                      }
                    />
                  </View>

                  <View style={styles.spotInfo}>
                    <View style={styles.spotTitleRow}>
                      <Text
                        style={[
                          styles.spotName,
                          {
                            color:
                              selectedSpot?.id === spot.id ? '#FFFFFF' : colors.text,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {spot.name}
                      </Text>
                      {spot.isVerified && (
                        <Ionicons
                          name="shield-checkmark"
                          size={16}
                          color={
                            selectedSpot?.id === spot.id
                              ? '#FFFFFF'
                              : BookLoopColors.success
                          }
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.spotAddress,
                        {
                          color:
                            selectedSpot?.id === spot.id
                              ? 'rgba(255,255,255,0.8)'
                              : colors.textSecondary,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {spot.address}
                    </Text>
                  </View>

                  {spot.distance && (
                    <Text
                      style={[
                        styles.spotDistance,
                        {
                          color:
                            selectedSpot?.id === spot.id
                              ? '#FFFFFF'
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {formatDistance(spot.distance)}
                    </Text>
                  )}
                </View>

                {spot.operatingHours && (
                  <View style={styles.spotHours}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={
                        selectedSpot?.id === spot.id
                          ? 'rgba(255,255,255,0.7)'
                          : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.spotHoursText,
                        {
                          color:
                            selectedSpot?.id === spot.id
                              ? 'rgba(255,255,255,0.7)'
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {spot.operatingHours}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Confirm Button */}
          <View style={styles.confirmContainer}>
            <GlassButton
              title={selectedSpot ? `Select ${selectedSpot.name}` : 'Select a Location'}
              onPress={handleConfirm}
              variant="primary"
              size="lg"
              disabled={!selectedSpot}
              icon="checkmark-circle"
            />
          </View>
        </View>
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
  mapContainer: {
    height: MAP_HEIGHT,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  legend: {
    position: 'absolute',
    top: 100,
    right: Spacing.md,
    flexDirection: 'column',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: Typography.fontSize.xs,
  },
  bottomSheet: {
    flex: 1,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    marginTop: -Spacing.lg,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: BookLoopColors.warmGray,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
  },
  sheetSubtitle: {
    fontSize: Typography.fontSize.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  spotsList: {
    flex: 1,
  },
  spotCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  spotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  spotIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotInfo: {
    flex: 1,
  },
  spotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  spotName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    flex: 1,
  },
  spotAddress: {
    fontSize: Typography.fontSize.sm,
    marginTop: 2,
  },
  spotDistance: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  spotHours: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    marginLeft: 52,
  },
  spotHoursText: {
    fontSize: Typography.fontSize.xs,
  },
  confirmContainer: {
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
});
