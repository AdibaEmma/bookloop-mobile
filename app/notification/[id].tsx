/**
 * Notification Detail Screen
 *
 * Shows full notification details with action buttons
 * to navigate to related content (exchanges, listings, etc.)
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  Colors,
  BookLoopColors,
  Typography,
  Spacing,
  BorderRadius,
} from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Notification } from '@/services/api/notifications.service';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface NotificationTypeConfig {
  icon: IoniconsName;
  color: string;
  label: string;
  actionLabel?: string;
  getRoute?: (data: Record<string, any>) => string | null;
}

// Keyed on the backend's lowercase type values (e.g. "exchange_request").
// Deep-link straight to the exchange/listing when the notification carries
// its id; fall back to the list screens when it doesn't.
const notificationTypeConfig: Record<string, NotificationTypeConfig> = {
  exchange_request: {
    icon: 'swap-horizontal',
    color: BookLoopColors.coffeeBrown,
    label: 'Exchange request',
    actionLabel: 'View request',
    getRoute: (data) => (data?.exchangeId ? `/exchange/${data.exchangeId}` : '/exchange/my-exchanges'),
  },
  exchange_accepted: {
    icon: 'checkmark-circle',
    color: BookLoopColors.success,
    label: 'Request accepted',
    actionLabel: 'View exchange',
    getRoute: (data) => (data?.exchangeId ? `/exchange/${data.exchangeId}` : '/exchange/my-exchanges'),
  },
  exchange_declined: {
    icon: 'close-circle',
    color: BookLoopColors.error,
    label: 'Request declined',
    actionLabel: 'View your swaps',
    getRoute: () => '/(tabs)/exchanges',
  },
  exchange_completed: {
    icon: 'star',
    color: BookLoopColors.mutedGold,
    label: 'Swap completed',
    actionLabel: 'Rate this swap',
    getRoute: (data) => (data?.exchangeId ? `/exchange/rate/${data.exchangeId}` : '/(tabs)/exchanges'),
  },
  exchange_cancelled: {
    icon: 'close-circle-outline',
    color: BookLoopColors.warning,
    label: 'Exchange cancelled',
    actionLabel: 'View your swaps',
    getRoute: () => '/(tabs)/exchanges',
  },
  exchange_reminder: {
    icon: 'time',
    color: BookLoopColors.burntOrange,
    label: 'Meetup reminder',
    actionLabel: 'View exchange',
    getRoute: (data) => (data?.exchangeId ? `/exchange/${data.exchangeId}` : '/(tabs)/exchanges'),
  },
  rating_received: {
    icon: 'star',
    color: BookLoopColors.mutedGold,
    label: 'New rating',
    actionLabel: 'View your profile',
    getRoute: () => '/(tabs)/profile',
  },
  message_received: {
    icon: 'mail',
    color: BookLoopColors.info,
    label: 'New message',
  },
  listing_approved: {
    icon: 'checkmark-done-circle',
    color: BookLoopColors.success,
    label: 'Listing approved',
    actionLabel: 'View listing',
    getRoute: (data) => (data?.listingId ? `/listing/${data.listingId}` : null),
  },
  listing_rejected: {
    icon: 'warning',
    color: BookLoopColors.error,
    label: 'Listing needs changes',
    actionLabel: 'View listing',
    getRoute: (data) => (data?.listingId ? `/listing/${data.listingId}` : null),
  },
  system_announcement: {
    icon: 'megaphone',
    color: BookLoopColors.coffeeBrown,
    label: 'Announcement',
  },
};

const defaultConfig: NotificationTypeConfig = {
  icon: 'notifications',
  color: BookLoopColors.coffeeBrown,
  label: 'Notification',
};

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { notifications, markAsRead } = useNotifications();

  const [notification, setNotification] = useState<Notification | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Find notification from context
    const found = notifications.find((n) => n.id === id);
    if (found) {
      setNotification(found);
      // Mark as read
      if (!found.isRead) {
        markAsRead(found.id);
      }
    }
    setIsLoading(false);
  }, [id, notifications, markAsRead]);

  const config = notification
    ? notificationTypeConfig[notification.type?.toLowerCase?.() ?? ''] || defaultConfig
    : defaultConfig;

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Just now';
      }
      return format(date, "EEEE, MMMM d, yyyy 'at' h:mm a");
    } catch {
      return 'Just now';
    }
  };

  const handleActionPress = () => {
    if (!config.getRoute) return;
    const route = config.getRoute(notification?.data ?? {});
    if (route) {
      router.push(route as any);
    }
  };

  const handleDelete = async () => {
    // Could implement delete here if needed
    router.back();
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BookLoopColors.burntOrange} />
        </View>
      </SafeAreaView>
    );
  }

  if (!notification) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Notification
          </Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Notification not found
          </Text>
          <GlassButton
            title="Go Back"
            onPress={() => router.back()}
            style={styles.errorButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {config.label}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={styles.iconSection}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${config.color}20` },
            ]}
          >
            <Ionicons name={config.icon} size={48} color={config.color} />
          </View>
        </View>

        {/* Main Content Card */}
        <GlassCard style={styles.mainCard}>
          <Text style={[styles.title, { color: colors.text }]}>
            {notification.title}
          </Text>

          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {notification.message}
          </Text>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Ionicons
              name="time-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {formatDate(notification.createdAt)}
            </Text>
          </View>

          {notification.isRead && notification.readAt && (
            <View style={styles.metaRow}>
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color={BookLoopColors.success}
              />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                Read {formatDate(notification.readAt)}
              </Text>
            </View>
          )}
        </GlassCard>

        {/* Additional Data Card (if any) */}
        {notification.data?.rating != null && (
          <GlassCard style={styles.dataCard}>
            <Text style={[styles.dataTitle, { color: colors.text }]}>
              Details
            </Text>

            {notification.data.rating && (
              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>
                  Rating
                </Text>
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= notification.data!.rating ? 'star' : 'star-outline'}
                      size={16}
                      color={BookLoopColors.mutedGold}
                    />
                  ))}
                </View>
              </View>
            )}
          </GlassCard>
        )}

        {/* Action Button */}
        {config.actionLabel && config.getRoute && (
          <GlassButton
            title={config.actionLabel}
            onPress={handleActionPress}
            style={styles.actionButton}
            icon="arrow-forward"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BookLoopColors.lightGray,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.md,
  },
  message: {
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.relaxed,
    marginBottom: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: BookLoopColors.lightGray,
    marginVertical: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  metaText: {
    fontSize: Typography.fontSize.sm,
  },
  dataCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  dataTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.md,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: BookLoopColors.lightGray,
  },
  dataLabel: {
    fontSize: Typography.fontSize.sm,
  },
  dataValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  actionButton: {
    marginTop: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: Typography.fontSize.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  errorButton: {
    minWidth: 150,
  },
});
