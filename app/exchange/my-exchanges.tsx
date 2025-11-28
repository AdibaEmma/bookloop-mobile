/**
 * My Exchanges Screen
 *
 * View and manage exchange requests (incoming and outgoing).
 *
 * Features:
 * - View incoming requests (requests to your listings)
 * - View outgoing requests (your requests to others)
 * - Accept/decline requests
 * - View exchange status
 * - Complete exchanges
 * - Rate after completion
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard, GlassButton, Avatar } from '@/components/ui';
import { exchangesService } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';

type TabType = 'incoming' | 'outgoing';

interface Exchange {
  id: string;
  listingId: string;
  requesterId: string;
  ownerId: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  message?: string;
  meetupLocation?: string;
  meetupTime?: string;
  listing: {
    id: string;
    book: {
      title: string;
      author: string;
      coverImage?: string;
    };
  };
  requester: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    karma: number;
  };
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    karma: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function MyExchangesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [activeTab, setActiveTab] = useState<TabType>('incoming');
  const [incomingExchanges, setIncomingExchanges] = useState<Exchange[]>([]);
  const [outgoingExchanges, setOutgoingExchanges] = useState<Exchange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Load exchanges on focus
   */
  useFocusEffect(
    useCallback(() => {
      loadExchanges();
    }, [])
  );

  /**
   * Load exchanges
   */
  const loadExchanges = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const [incoming, outgoing] = await Promise.all([
        exchangesService.getIncomingRequests(),
        exchangesService.getMyRequests(),
      ]);

      setIncomingExchanges(incoming);
      setOutgoingExchanges(outgoing);
    } catch (error) {
      console.error('Failed to load exchanges:', error);
      Alert.alert('Error', 'Failed to load exchanges');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  /**
   * Accept exchange request
   */
  const handleAccept = async (exchange: Exchange) => {
    try {
      await exchangesService.acceptExchange(exchange.id);
      Alert.alert('Success', 'Exchange request accepted!');
      loadExchanges(true);
    } catch (error) {
      console.error('Failed to accept exchange:', error);
      Alert.alert('Error', 'Failed to accept exchange request');
    }
  };

  /**
   * Decline exchange request
   */
  const handleDecline = async (exchange: Exchange) => {
    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await exchangesService.declineExchange(exchange.id);
              Alert.alert('Request Declined', 'The request has been declined');
              loadExchanges(true);
            } catch (error) {
              console.error('Failed to decline exchange:', error);
              Alert.alert('Error', 'Failed to decline exchange request');
            }
          },
        },
      ]
    );
  };

  /**
   * Cancel exchange request
   */
  const handleCancel = async (exchange: Exchange) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await exchangesService.cancelExchange(exchange.id);
              Alert.alert('Request Cancelled', 'Your request has been cancelled');
              loadExchanges(true);
            } catch (error) {
              console.error('Failed to cancel exchange:', error);
              Alert.alert('Error', 'Failed to cancel exchange request');
            }
          },
        },
      ]
    );
  };

  /**
   * Mark exchange as completed
   */
  const handleComplete = async (exchange: Exchange) => {
    Alert.alert(
      'Complete Exchange',
      'Have you successfully exchanged the book?',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, Complete',
          onPress: async () => {
            try {
              await exchangesService.completeExchange(exchange.id);
              Alert.alert(
                'Exchange Completed!',
                'Please rate your experience with this exchange',
                [
                  {
                    text: 'Rate Now',
                    onPress: () =>
                      router.push({
                        pathname: '/exchange/rate/[id]',
                        params: { id: exchange.id },
                      }),
                  },
                  {
                    text: 'Later',
                    onPress: () => loadExchanges(true),
                  },
                ]
              );
            } catch (error) {
              console.error('Failed to complete exchange:', error);
              Alert.alert('Error', 'Failed to complete exchange');
            }
          },
        },
      ]
    );
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      pending: '#FF9500',
      accepted: '#34C759',
      declined: '#FF3B30',
      completed: '#007AFF',
      cancelled: '#8E8E93',
    };
    return colors[status] || '#8E8E93';
  };

  /**
   * Get status label
   */
  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      accepted: 'Accepted',
      declined: 'Declined',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  };

  /**
   * Render exchange card
   */
  const renderExchange = ({ item: exchange }: { item: Exchange }) => {
    const isIncoming = activeTab === 'incoming';
    const otherUser = isIncoming ? exchange.requester : exchange.owner;

    return (
      <GlassCard variant="lg" padding="lg" style={styles.exchangeCard}>
        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(exchange.status) },
          ]}
        >
          <Text style={styles.statusText}>{getStatusLabel(exchange.status)}</Text>
        </View>

        {/* Book Info */}
        <View style={styles.bookSection}>
          <Image
            source={{
              uri:
                exchange.listing.book.coverImage ||
                'https://via.placeholder.com/60x90',
            }}
            style={styles.bookCover}
          />

          <View style={styles.bookInfo}>
            <Text style={[styles.bookTitle, { color: colors.text }]}>
              {exchange.listing.book.title}
            </Text>
            <Text style={[styles.bookAuthor, { color: colors.textSecondary }]}>
              by {exchange.listing.book.author}
            </Text>
          </View>
        </View>

        {/* User Info */}
        <View style={styles.userSection}>
          <Avatar
            imageUrl={otherUser.avatarUrl}
            name={`${otherUser.firstName} ${otherUser.lastName}`}
            size={40}
          />

          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {isIncoming ? 'Request from' : 'Request to'} {otherUser.firstName}{' '}
              {otherUser.lastName}
            </Text>
            <View style={styles.karmaContainer}>
              <Ionicons
                name="trophy"
                size={14}
                color={BookLoopColors.burntOrange}
              />
              <Text style={[styles.karmaText, { color: colors.textSecondary }]}>
                {otherUser.karma} Karma
              </Text>
            </View>
          </View>
        </View>

        {/* Message */}
        {exchange.message && (
          <View style={styles.messageSection}>
            <Text style={[styles.messageLabel, { color: colors.textSecondary }]}>
              Message:
            </Text>
            <Text style={[styles.messageText, { color: colors.text }]}>
              {exchange.message}
            </Text>
          </View>
        )}

        {/* Meetup Location */}
        {exchange.meetupLocation && (
          <View style={styles.locationSection}>
            <Ionicons
              name="location"
              size={16}
              color={BookLoopColors.burntOrange}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.locationName, { color: colors.text }]}>
                {exchange.meetupLocation.name}
              </Text>
              <Text
                style={[styles.locationAddress, { color: colors.textSecondary }]}
              >
                {exchange.meetupLocation.address}
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        {exchange.status === 'pending' && isIncoming && (
          <View style={styles.actions}>
            <GlassButton
              title="Decline"
              onPress={() => handleDecline(exchange)}
              variant="ghost"
              size="sm"
              style={{ flex: 1 }}
            />
            <GlassButton
              title="Accept"
              onPress={() => handleAccept(exchange)}
              variant="primary"
              size="sm"
              style={{ flex: 1 }}
            />
          </View>
        )}

        {exchange.status === 'pending' && !isIncoming && (
          <GlassButton
            title="Cancel Request"
            onPress={() => handleCancel(exchange)}
            variant="ghost"
            size="sm"
          />
        )}

        {exchange.status === 'accepted' && (
          <GlassButton
            title="Mark as Completed"
            onPress={() => handleComplete(exchange)}
            variant="primary"
            size="sm"
            icon="checkmark-circle"
          />
        )}

        {exchange.status === 'completed' && (
          <GlassButton
            title="Rate Exchange"
            onPress={() =>
              router.push({
                pathname: '/exchange/rate/[id]',
                params: { id: exchange.id },
              })
            }
            variant="ghost"
            size="sm"
            icon="star"
          />
        )}
      </GlassCard>
    );
  };

  /**
   * Render empty state
   */
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <GlassCard variant="lg" padding="xl">
        <View style={styles.emptyContent}>
          <Ionicons
            name="swap-horizontal-outline"
            size={64}
            color={colors.textSecondary}
            style={styles.emptyIcon}
          />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No {activeTab === 'incoming' ? 'Incoming' : 'Outgoing'} Exchanges
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
            {activeTab === 'incoming'
              ? 'You have no pending requests for your listings'
              : 'You haven\'t requested any books yet'}
          </Text>
        </View>
      </GlassCard>
    </View>
  );

  const currentExchanges =
    activeTab === 'incoming' ? incomingExchanges : outgoingExchanges;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
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

        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
          {/* Custom Header */}
          <View style={styles.customHeader}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={BookLoopColors.burntOrange}
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              My Exchanges
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              onPress={() => setActiveTab('incoming')}
              style={[
                styles.tab,
                {
                  backgroundColor:
                    activeTab === 'incoming'
                      ? BookLoopColors.burntOrange
                      : colors.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'incoming' ? '#FFFFFF' : colors.text },
                ]}
              >
                Incoming ({incomingExchanges.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('outgoing')}
              style={[
                styles.tab,
                {
                  backgroundColor:
                    activeTab === 'outgoing'
                      ? BookLoopColors.burntOrange
                      : colors.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'outgoing' ? '#FFFFFF' : colors.text },
                ]}
              >
                Outgoing ({outgoingExchanges.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Exchanges List */}
          <FlatList
            data={currentExchanges}
            renderItem={renderExchange}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={!isLoading ? renderEmpty : null}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => loadExchanges(true)}
                tintColor={BookLoopColors.burntOrange}
              />
            }
          />
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  exchangeCard: {
    position: 'relative',
  },
  statusBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  bookSection: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  bookCover: {
    width: 60,
    height: 90,
    borderRadius: 6,
  },
  bookInfo: {
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
  },
  userSection: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: 4,
  },
  karmaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  karmaText: {
    fontSize: Typography.fontSize.xs,
  },
  messageSection: {
    marginBottom: Spacing.md,
  },
  messageLabel: {
    fontSize: Typography.fontSize.xs,
    marginBottom: 4,
  },
  messageText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  locationSection: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  locationName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  locationAddress: {
    fontSize: Typography.fontSize.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
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
  },
  emptyTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
  },
});
