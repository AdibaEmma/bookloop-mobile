/**
 * Exchange Detail Screen
 *
 * View and manage a specific book exchange.
 *
 * Features:
 * - Full exchange details with book and user info
 * - Interactive map showing meetup location
 * - Timeline/journey view of exchange status
 * - Meetup confirmation for both parties
 * - QR code handover for secure completion
 * - Rating after completion
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GlassCard, GlassButton, Avatar } from '@/components/ui';
import { BookCover } from '@/components/ui/BookCover';
import { useAuth } from '@/contexts/AuthContext';
import { exchangesService, Exchange } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
  BorderRadius,
} from '@/constants/theme';

interface TimelineStep {
  key: string;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  completed: boolean;
  active: boolean;
  timestamp?: string;
}

export default function ExchangeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const mapRef = useRef<MapView>(null);

  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Determine user role
  const isOwner = exchange?.owner_id === user?.id;
  const isRequester = exchange?.requester_id === user?.id;
  const otherUser = isOwner ? exchange?.requester : exchange?.owner;

  /**
   * Load exchange on focus
   */
  useFocusEffect(
    useCallback(() => {
      loadExchange();
    }, [id])
  );

  /**
   * Load exchange details
   */
  const loadExchange = async () => {
    try {
      setIsLoading(true);
      const data = await exchangesService.getExchangeById(id);
      setExchange(data);
    } catch (error) {
      console.error('Failed to load exchange:', error);
      Alert.alert('Error', 'Failed to load exchange details');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Parse meetup location from various formats
   */
  const getMeetupCoordinates = (): { latitude: number; longitude: number } | null => {
    if (!exchange?.meetup_location) return null;

    const location = exchange.meetup_location;

    // Handle string format (WKT)
    if (typeof location === 'string') {
      const match = location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
      if (match) {
        return {
          longitude: parseFloat(match[1]),
          latitude: parseFloat(match[2]),
        };
      }
    }

    // Handle GeoJSON format
    if (typeof location === 'object' && location.coordinates) {
      return {
        longitude: location.coordinates[0],
        latitude: location.coordinates[1],
      };
    }

    return null;
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  /**
   * Format time for display
   */
  const formatTime = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      pending: BookLoopColors.warning,
      accepted: BookLoopColors.success,
      declined: BookLoopColors.error,
      completed: BookLoopColors.info,
      cancelled: '#8E8E93',
    };
    return statusColors[status] || '#8E8E93';
  };

  /**
   * Get timeline steps based on exchange status
   */
  const getTimelineSteps = (): TimelineStep[] => {
    if (!exchange) return [];

    const steps: TimelineStep[] = [
      {
        key: 'requested',
        label: 'Requested',
        description: 'Exchange request sent',
        icon: 'paper-plane',
        completed: true,
        active: exchange.status === 'pending',
        timestamp: exchange.created_at,
      },
      {
        key: 'accepted',
        label: 'Accepted',
        description: 'Request accepted by owner',
        icon: 'checkmark-circle',
        completed: ['accepted', 'completed'].includes(exchange.status),
        active: exchange.status === 'accepted' && !exchange.requester_confirmed_meetup && !exchange.owner_confirmed_meetup,
      },
      {
        key: 'meetup_confirmed',
        label: 'Meetup Confirmed',
        description: 'Both parties confirmed meetup',
        icon: 'location',
        completed: exchange.requester_confirmed_meetup && exchange.owner_confirmed_meetup,
        active: exchange.status === 'accepted' && (exchange.requester_confirmed_meetup || exchange.owner_confirmed_meetup),
      },
      {
        key: 'completed',
        label: 'Completed',
        description: 'Exchange completed successfully',
        icon: 'trophy',
        completed: exchange.status === 'completed',
        active: false,
        timestamp: exchange.completed_at,
      },
    ];

    return steps;
  };

  /**
   * Handle accept exchange
   */
  const handleAccept = async () => {
    if (!exchange) return;

    try {
      setIsActionLoading(true);
      await exchangesService.acceptExchange(exchange.id);
      Alert.alert('Success', 'Exchange request accepted!');
      loadExchange();
    } catch (error) {
      console.error('Failed to accept:', error);
      Alert.alert('Error', 'Failed to accept exchange');
    } finally {
      setIsActionLoading(false);
    }
  };

  /**
   * Handle decline exchange
   */
  const handleDecline = async () => {
    if (!exchange) return;

    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this exchange request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsActionLoading(true);
              await exchangesService.declineExchange(exchange.id);
              Alert.alert('Declined', 'Exchange request has been declined');
              router.back();
            } catch (error) {
              console.error('Failed to decline:', error);
              Alert.alert('Error', 'Failed to decline exchange');
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Handle cancel exchange
   */
  const handleCancel = async () => {
    if (!exchange) return;

    Alert.alert(
      'Cancel Exchange',
      'Are you sure you want to cancel this exchange?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsActionLoading(true);
              await exchangesService.cancelExchange(exchange.id);
              Alert.alert('Cancelled', 'Exchange has been cancelled');
              router.back();
            } catch (error) {
              console.error('Failed to cancel:', error);
              Alert.alert('Error', 'Failed to cancel exchange');
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Handle confirm meetup
   */
  const handleConfirmMeetup = async () => {
    if (!exchange) return;

    Alert.alert(
      'Confirm Meetup',
      'By confirming, you agree to meet at the proposed location and time. Are you ready?',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setIsActionLoading(true);
              await exchangesService.confirmMeetup(exchange.id);
              Alert.alert('Confirmed!', 'You have confirmed the meetup. See you there!');
              loadExchange();
            } catch (error) {
              console.error('Failed to confirm:', error);
              Alert.alert('Error', 'Failed to confirm meetup');
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Handle confirm completion
   */
  const handleConfirmCompletion = async () => {
    if (!exchange) return;

    Alert.alert(
      'Confirm Exchange Completion',
      'Have you successfully exchanged the book? Both parties must confirm to complete the exchange.',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, Confirm',
          onPress: async () => {
            try {
              setIsActionLoading(true);
              await exchangesService.confirmCompletion(exchange.id);

              // Check if exchange is now completed
              const updated = await exchangesService.getExchangeById(exchange.id);
              if (updated.status === 'completed') {
                Alert.alert(
                  'Exchange Completed!',
                  'The exchange is complete. Would you like to rate your experience?',
                  [
                    { text: 'Later', onPress: () => loadExchange() },
                    { text: 'Rate Now', onPress: () => handleRate() },
                  ]
                );
              } else {
                Alert.alert(
                  'Confirmation Recorded',
                  'Waiting for the other party to confirm completion.'
                );
                loadExchange();
              }
            } catch (error) {
              console.error('Failed to confirm:', error);
              Alert.alert('Error', 'Failed to confirm completion');
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Navigate to QR handover
   */
  const handleStartHandover = () => {
    router.push({
      pathname: '/exchange/qr-handover',
      params: { exchangeId: id },
    });
  };

  /**
   * Open maps app for navigation
   */
  const handleOpenMaps = () => {
    const coords = getMeetupCoordinates();
    if (!coords) return;

    const address = encodeURIComponent(exchange?.meetup_address || '');
    const scheme = Platform.select({
      ios: `maps:0,0?q=${address}@${coords.latitude},${coords.longitude}`,
      android: `geo:0,0?q=${coords.latitude},${coords.longitude}(${address})`,
    });

    if (scheme) {
      Linking.openURL(scheme);
    }
  };

  /**
   * Navigate to rate screen
   */
  const handleRate = () => {
    router.push({
      pathname: '/exchange/rate/[id]',
      params: { id: id },
    });
  };

  // Loading state
  if (isLoading || !exchange) {
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

  const meetupCoords = getMeetupCoordinates();
  const timelineSteps = getTimelineSteps();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Exchange Details',
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
          {/* Status Banner */}
          <View style={[styles.statusBanner, { backgroundColor: getStatusColor(exchange.status) }]}>
            <Text style={styles.statusBannerText}>
              {exchange.status.charAt(0).toUpperCase() + exchange.status.slice(1)}
            </Text>
          </View>

          {/* Book Info Card */}
          <GlassCard variant="lg" padding="lg">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Book</Text>
            <View style={styles.bookInfo}>
              <View style={styles.bookCover}>
                <BookCover
                  title={exchange.listing?.book?.title ?? 'Book'}
                  author={exchange.listing?.book?.author}
                  coverImage={exchange.listing?.book?.coverImage}
                  size="md"
                  fill
                />
              </View>
              <View style={styles.bookDetails}>
                <Text style={[styles.bookTitle, { color: colors.text }]} numberOfLines={2}>
                  {exchange.listing?.book?.title || 'Unknown Book'}
                </Text>
                <Text style={[styles.bookAuthor, { color: colors.textSecondary }]}>
                  by {exchange.listing?.book?.author || 'Unknown Author'}
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Exchange Parties */}
          <GlassCard variant="lg" padding="lg">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {isOwner ? 'Requester' : 'Book Owner'}
            </Text>
            {otherUser && (
              <View style={styles.userRow}>
                <Avatar
                  imageUrl={otherUser.profile_picture}
                  name={`${otherUser.first_name || ''} ${otherUser.last_name || ''}`}
                  size="lg"
                />
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.text }]}>
                    {otherUser.first_name || 'User'} {otherUser.last_name || ''}
                  </Text>
                  <View style={styles.karmaRow}>
                    <Ionicons name="star" size={16} color={BookLoopColors.mutedGold} />
                    <Text style={[styles.karmaText, { color: colors.textSecondary }]}>
                      {otherUser.rating ? Number(otherUser.rating).toFixed(1) : '5.0'} rating
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Message */}
            {exchange.requester_message && (
              <View style={[styles.messageBox, { backgroundColor: colors.surface }]}>
                <Text style={[styles.messageLabel, { color: colors.textSecondary }]}>
                  {isOwner ? 'Message from requester' : 'Your message'}
                </Text>
                <Text style={[styles.messageText, { color: colors.text }]}>
                  "{exchange.requester_message}"
                </Text>
              </View>
            )}
          </GlassCard>

          {/* Next Steps Banner - Shows after acceptance */}
          {exchange.status === 'accepted' && (
            <GlassCard variant="lg" padding="lg" style={styles.nextStepsCard}>
              <View style={styles.nextStepsHeader}>
                <View style={[styles.nextStepsIcon, { backgroundColor: BookLoopColors.info + '20' }]}>
                  <Ionicons name="information-circle" size={24} color={BookLoopColors.info} />
                </View>
                <View style={styles.nextStepsContent}>
                  <Text style={[styles.nextStepsTitle, { color: colors.text }]}>
                    {!exchange.requester_confirmed_meetup || !exchange.owner_confirmed_meetup
                      ? 'Next: Confirm Meetup Details'
                      : 'Ready for Exchange!'}
                  </Text>
                  <Text style={[styles.nextStepsDesc, { color: colors.textSecondary }]}>
                    {!exchange.meetup_location || !exchange.meetup_time
                      ? 'Set a meetup location and time, then both parties must confirm.'
                      : !exchange.requester_confirmed_meetup || !exchange.owner_confirmed_meetup
                      ? `${exchange.requester_confirmed_meetup ? (isRequester ? 'You confirmed' : 'Requester confirmed') : (isRequester ? 'You need to confirm' : 'Waiting for requester')}. ${exchange.owner_confirmed_meetup ? (isOwner ? 'You confirmed' : 'Owner confirmed') : (isOwner ? 'You need to confirm' : 'Waiting for owner')}.`
                      : 'Meet at the agreed location and use QR code handover to complete the exchange.'}
                  </Text>
                </View>
              </View>
            </GlassCard>
          )}

          {/* Meetup Details */}
          <GlassCard variant="lg" padding="lg">
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Meetup Details</Text>
              {/* Update Meetup Button - Only show if accepted and user hasn't confirmed yet */}
              {exchange.status === 'accepted' &&
               ((isRequester && !exchange.requester_confirmed_meetup) ||
                (isOwner && !exchange.owner_confirmed_meetup)) && (
                <TouchableOpacity
                  onPress={() => router.push({
                    pathname: '/exchange/update-meetup',
                    params: { exchangeId: exchange.id },
                  })}
                  style={[styles.updateMeetupButton, { backgroundColor: BookLoopColors.burntOrange + '15' }]}
                >
                  <Ionicons name="create-outline" size={16} color={BookLoopColors.burntOrange} />
                  <Text style={[styles.updateMeetupText, { color: BookLoopColors.burntOrange }]}>
                    {exchange.meetup_location ? 'Update' : 'Set Details'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* No meetup set warning */}
            {exchange.status === 'accepted' && (!exchange.meetup_location || !exchange.meetup_time) && (
              <View style={[styles.noMeetupWarning, { backgroundColor: BookLoopColors.warning + '15' }]}>
                <Ionicons name="warning" size={18} color={BookLoopColors.warning} />
                <Text style={[styles.noMeetupText, { color: colors.text }]}>
                  Meetup details not set. Tap "Set Details" to propose a location and time.
                </Text>
              </View>
            )}

            {/* Map */}
            {meetupCoords && (
              <TouchableOpacity onPress={handleOpenMaps} activeOpacity={0.9}>
                <View style={styles.mapContainer}>
                  <MapView
                    ref={mapRef}
                    style={styles.map}
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                    initialRegion={{
                      ...meetupCoords,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                  >
                    <Marker coordinate={meetupCoords}>
                      <View style={styles.meetupMarker}>
                        <Ionicons name="location" size={20} color="#FFFFFF" />
                      </View>
                    </Marker>
                  </MapView>
                  <View style={styles.mapOverlay}>
                    <Ionicons name="navigate" size={16} color="#FFFFFF" />
                    <Text style={styles.mapOverlayText}>Tap to open in Maps</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Location Info */}
            <View style={styles.meetupInfo}>
              <View style={styles.meetupRow}>
                <View style={[styles.meetupIcon, { backgroundColor: BookLoopColors.burntOrange + '20' }]}>
                  <Ionicons name="location" size={20} color={BookLoopColors.burntOrange} />
                </View>
                <View style={styles.meetupTextContainer}>
                  <Text style={[styles.meetupLabel, { color: colors.textSecondary }]}>Location</Text>
                  <Text style={[styles.meetupValue, { color: colors.text }]}>
                    {exchange.meetup_spot_name || exchange.meetup_address || 'Not set'}
                  </Text>
                </View>
              </View>

              <View style={styles.meetupRow}>
                <View style={[styles.meetupIcon, { backgroundColor: BookLoopColors.burntOrange + '20' }]}>
                  <Ionicons name="calendar" size={20} color={BookLoopColors.burntOrange} />
                </View>
                <View style={styles.meetupTextContainer}>
                  <Text style={[styles.meetupLabel, { color: colors.textSecondary }]}>Date</Text>
                  <Text style={[styles.meetupValue, { color: colors.text }]}>
                    {formatDate(exchange.meetup_time)}
                  </Text>
                </View>
              </View>

              <View style={styles.meetupRow}>
                <View style={[styles.meetupIcon, { backgroundColor: BookLoopColors.burntOrange + '20' }]}>
                  <Ionicons name="time" size={20} color={BookLoopColors.burntOrange} />
                </View>
                <View style={styles.meetupTextContainer}>
                  <Text style={[styles.meetupLabel, { color: colors.textSecondary }]}>Time</Text>
                  <Text style={[styles.meetupValue, { color: colors.text }]}>
                    {formatTime(exchange.meetup_time) || 'Not set'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Confirmation Status */}
            {exchange.status === 'accepted' && (
              <View style={[styles.confirmationStatus, { backgroundColor: colors.surface }]}>
                <Text style={[styles.confirmationTitle, { color: colors.text }]}>
                  Meetup Confirmation
                </Text>
                <View style={styles.confirmationRow}>
                  <Ionicons
                    name={exchange.requester_confirmed_meetup ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={exchange.requester_confirmed_meetup ? BookLoopColors.success : colors.textSecondary}
                  />
                  <Text style={[styles.confirmationText, { color: colors.text }]}>
                    {isRequester ? 'You' : 'Requester'} {exchange.requester_confirmed_meetup ? 'confirmed' : 'not confirmed'}
                  </Text>
                </View>
                <View style={styles.confirmationRow}>
                  <Ionicons
                    name={exchange.owner_confirmed_meetup ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={exchange.owner_confirmed_meetup ? BookLoopColors.success : colors.textSecondary}
                  />
                  <Text style={[styles.confirmationText, { color: colors.text }]}>
                    {isOwner ? 'You' : 'Owner'} {exchange.owner_confirmed_meetup ? 'confirmed' : 'not confirmed'}
                  </Text>
                </View>
              </View>
            )}
          </GlassCard>

          {/* Timeline */}
          <GlassCard variant="lg" padding="lg">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Exchange Timeline</Text>
            <View style={styles.timeline}>
              {timelineSteps.map((step, index) => (
                <View key={step.key} style={styles.timelineStep}>
                  <View style={styles.timelineLeft}>
                    <View
                      style={[
                        styles.timelineDot,
                        {
                          backgroundColor: step.completed
                            ? BookLoopColors.success
                            : step.active
                            ? BookLoopColors.burntOrange
                            : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={step.icon}
                        size={14}
                        color={step.completed || step.active ? '#FFFFFF' : colors.textSecondary}
                      />
                    </View>
                    {index < timelineSteps.length - 1 && (
                      <View
                        style={[
                          styles.timelineLine,
                          {
                            backgroundColor: step.completed ? BookLoopColors.success : colors.border,
                          },
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text
                      style={[
                        styles.timelineLabel,
                        {
                          color: step.completed || step.active ? colors.text : colors.textSecondary,
                          fontWeight: step.active ? '600' : '400',
                        },
                      ]}
                    >
                      {step.label}
                    </Text>
                    <Text style={[styles.timelineDesc, { color: colors.textSecondary }]}>
                      {step.description}
                    </Text>
                    {step.timestamp && (
                      <Text style={[styles.timelineTime, { color: colors.textSecondary }]}>
                        {formatDate(step.timestamp)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </GlassCard>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Pending - Owner Actions */}
            {exchange.status === 'pending' && isOwner && (
              <>
                <GlassButton
                  title="Decline"
                  onPress={handleDecline}
                  variant="ghost"
                  size="lg"
                  loading={isActionLoading}
                  style={styles.actionButton}
                />
                <GlassButton
                  title="Accept Request"
                  onPress={handleAccept}
                  variant="primary"
                  size="lg"
                  icon="checkmark-circle"
                  loading={isActionLoading}
                  style={styles.actionButton}
                />
              </>
            )}

            {/* Pending - Requester can cancel */}
            {exchange.status === 'pending' && isRequester && (
              <GlassButton
                title="Cancel Request"
                onPress={handleCancel}
                variant="ghost"
                size="lg"
                loading={isActionLoading}
                style={styles.actionButton}
              />
            )}

            {/* Accepted - Confirm meetup and completion flow */}
            {exchange.status === 'accepted' && (
              <>
                {/* Stage 1: Confirm meetup if user hasn't confirmed yet */}
                {((isRequester && !exchange.requester_confirmed_meetup) ||
                  (isOwner && !exchange.owner_confirmed_meetup)) && (
                  <GlassButton
                    title="Confirm Meetup"
                    onPress={handleConfirmMeetup}
                    variant="primary"
                    size="lg"
                    icon="checkmark-circle"
                    loading={isActionLoading}
                    style={styles.actionButton}
                  />
                )}

                {/* Stage 2: After meetup confirmed, show completion options */}
                {exchange.requester_confirmed_meetup && exchange.owner_confirmed_meetup && (
                  <>
                    {/* Show QR handover option */}
                    <GlassButton
                      title="Scan QR for Handover"
                      onPress={handleStartHandover}
                      variant="primary"
                      size="lg"
                      icon="qr-code"
                      style={styles.actionButton}
                    />

                    {/* Manual completion confirmation */}
                    {((isRequester && !exchange.requester_confirmed_completion) ||
                      (isOwner && !exchange.owner_confirmed_completion)) && (
                      <GlassButton
                        title="Confirm Exchange Complete"
                        onPress={handleConfirmCompletion}
                        variant="ghost"
                        size="lg"
                        icon="checkmark-done"
                        loading={isActionLoading}
                        style={styles.actionButton}
                      />
                    )}

                    {/* Show waiting status if one party confirmed */}
                    {((isRequester && exchange.requester_confirmed_completion && !exchange.owner_confirmed_completion) ||
                      (isOwner && exchange.owner_confirmed_completion && !exchange.requester_confirmed_completion)) && (
                      <View style={styles.waitingStatus}>
                        <Ionicons name="hourglass" size={20} color={BookLoopColors.warning} />
                        <Text style={[styles.waitingText, { color: colors.textSecondary }]}>
                          Waiting for the other party to confirm completion
                        </Text>
                      </View>
                    )}
                  </>
                )}

                {/* Cancel option */}
                <GlassButton
                  title="Cancel Exchange"
                  onPress={handleCancel}
                  variant="ghost"
                  size="sm"
                  loading={isActionLoading}
                />
              </>
            )}

            {/* Completed - Rate */}
            {exchange.status === 'completed' && (
              <GlassButton
                title="Rate This Exchange"
                onPress={handleRate}
                variant="primary"
                size="lg"
                icon="star"
                style={styles.actionButton}
              />
            )}
          </View>
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
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },
  statusBanner: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  statusBannerText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  nextStepsCard: {
    borderLeftWidth: 4,
    borderLeftColor: BookLoopColors.info,
  },
  nextStepsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  nextStepsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextStepsContent: {
    flex: 1,
  },
  nextStepsTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  nextStepsDesc: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  updateMeetupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  updateMeetupText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  noMeetupWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  noMeetupText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    lineHeight: 18,
  },
  bookInfo: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  bookCover: {
    overflow: 'hidden',
    width: 80,
    height: 120,
    borderRadius: BorderRadius.md,
  },
  bookDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  bookAuthor: {
    fontSize: Typography.fontSize.base,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  karmaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  karmaText: {
    fontSize: Typography.fontSize.sm,
  },
  messageBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  messageLabel: {
    fontSize: Typography.fontSize.xs,
    marginBottom: Spacing.xs,
  },
  messageText: {
    fontSize: Typography.fontSize.sm,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  mapContainer: {
    height: 150,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  map: {
    flex: 1,
  },
  meetupMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BookLoopColors.burntOrange,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  mapOverlayText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.xs,
  },
  meetupInfo: {
    gap: Spacing.md,
  },
  meetupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  meetupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  meetupTextContainer: {
    flex: 1,
  },
  meetupLabel: {
    fontSize: Typography.fontSize.xs,
    marginBottom: 2,
  },
  meetupValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
  confirmationStatus: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  confirmationTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  confirmationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  confirmationText: {
    fontSize: Typography.fontSize.sm,
  },
  timeline: {
    paddingLeft: Spacing.xs,
  },
  timelineStep: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 30,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: Spacing.xs,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: Spacing.md,
    paddingBottom: Spacing.md,
  },
  timelineLabel: {
    fontSize: Typography.fontSize.base,
    marginBottom: 2,
  },
  timelineDesc: {
    fontSize: Typography.fontSize.sm,
  },
  timelineTime: {
    fontSize: Typography.fontSize.xs,
    marginTop: Spacing.xs,
  },
  actionsContainer: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    width: '100%',
  },
  waitingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: BookLoopColors.warning + '15',
  },
  waitingText: {
    fontSize: Typography.fontSize.sm,
    flex: 1,
    textAlign: 'center',
  },
});
