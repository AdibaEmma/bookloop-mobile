/**
 * Notifications Screen
 *
 * Displays user's notifications with pull-to-refresh,
 * infinite scroll, and notification management actions.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationItem } from '@/components/ui/NotificationItem';
import { GlassButton } from '@/components/ui/GlassButton';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  Colors,
  BookLoopColors,
  Typography,
  Spacing,
  BorderRadius,
} from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Notification } from '@/services/api/notifications.service';
import { notificationRoute } from '@/utils/notificationRoutes';

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    fetchNotifications,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearReadNotifications,
  } = useNotifications();

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshNotifications();
    setIsRefreshing(false);
  }, [refreshNotifications]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchNotifications(false);
    }
  }, [fetchNotifications, isLoading, hasMore]);

  const handleNotificationPress = useCallback(
    (notification: Notification) => {
      if (!notification.isRead) {
        markAsRead(notification.id);
      }
      // Go straight to what the notification is about (the exchange, the
      // listing); the detail screen is only for types with no destination.
      const route = notificationRoute(notification.type, notification.data);
      router.push((route ?? `/notification/${notification.id}`) as any);
    },
    [markAsRead]
  );

  const handleDeleteNotification = useCallback(
    async (notificationId: string) => {
      await deleteNotification(notificationId);
    },
    [deleteNotification]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    if (unreadCount > 0) {
      await markAllAsRead();
    }
  }, [markAllAsRead, unreadCount]);

  const handleClearRead = useCallback(() => {
    const readCount = notifications.filter((n) => n.isRead).length;
    if (readCount === 0) return;
    setShowClearConfirm(true);
  }, [notifications]);

  const confirmClearRead = useCallback(() => {
    setShowClearConfirm(false);
    clearReadNotifications();
  }, [clearReadNotifications]);

  const renderNotification = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationItem
        notification={item}
        onPress={handleNotificationPress}
        onDelete={handleDeleteNotification}
      />
    ),
    [handleNotificationPress, handleDeleteNotification]
  );

  const renderHeader = () => (
    <View style={styles.actionsContainer}>
      {unreadCount > 0 && (
        <Pressable style={styles.actionButton} onPress={handleMarkAllAsRead}>
          <Ionicons
            name="checkmark-done-outline"
            size={18}
            color={BookLoopColors.coffeeBrown}
          />
          <Text style={[styles.actionText, { color: colors.text }]}>
            Mark all as read
          </Text>
        </Pressable>
      )}
      {notifications.some((n) => n.isRead) && (
        <Pressable style={styles.actionButton} onPress={handleClearRead}>
          <Ionicons name="trash-outline" size={18} color={BookLoopColors.error} />
          <Text style={[styles.actionText, { color: colors.text }]}>
            Clear read
          </Text>
        </Pressable>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIconContainer,
          { backgroundColor: `${BookLoopColors.coffeeBrown}20` },
        ]}
      >
        <Ionicons
          name="notifications-off-outline"
          size={48}
          color={BookLoopColors.coffeeBrown}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No notifications yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        When you receive notifications about exchanges, listings, or messages,
        they'll appear here.
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    if (isLoading && notifications.length > 0) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator color={BookLoopColors.burntOrange} />
        </View>
      );
    }
    return null;
  };

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
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={notifications.length > 0 ? renderHeader : null}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={BookLoopColors.burntOrange}
            colors={[BookLoopColors.burntOrange]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={
          notifications.length === 0 ? styles.emptyList : styles.list
        }
        showsVerticalScrollIndicator={false}
      />

      <ConfirmModal
        visible={showClearConfirm}
        title="Clear read notifications"
        message="Delete all notifications you've already read? This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmClearRead}
        onCancel={() => setShowClearConfirm(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
  },
  headerRight: {
    width: 40,
  },
  badge: {
    backgroundColor: BookLoopColors.burntOrange,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  list: {
    paddingVertical: Spacing.sm,
  },
  emptyList: {
    flexGrow: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  actionText: {
    fontSize: Typography.fontSize.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
    lineHeight: Typography.fontSize.base * Typography.lineHeight.relaxed,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});
