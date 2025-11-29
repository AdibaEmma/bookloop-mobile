/**
 * NotificationItem Component
 *
 * Displays a single notification with icon, title, message, and timestamp.
 * Supports swipe-to-delete and tap-to-mark-as-read.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from './GlassCard';
import {
  BookLoopColors,
  BorderRadius,
  Typography,
  Spacing,
  Colors,
} from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Notification } from '@/services/api/notifications.service';

interface NotificationItemProps {
  notification: Notification;
  onPress?: (notification: Notification) => void;
  onDelete?: (notificationId: string) => void;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// Map notification types to icons
const getNotificationIcon = (type: string): { name: IoniconsName; color: string } => {
  switch (type) {
    case 'EXCHANGE_REQUEST':
      return { name: 'swap-horizontal', color: BookLoopColors.info };
    case 'EXCHANGE_ACCEPTED':
      return { name: 'checkmark-circle', color: BookLoopColors.success };
    case 'EXCHANGE_DECLINED':
      return { name: 'close-circle', color: BookLoopColors.error };
    case 'EXCHANGE_COMPLETED':
      return { name: 'star', color: BookLoopColors.mutedGold };
    case 'EXCHANGE_CANCELLED':
      return { name: 'close-circle-outline', color: BookLoopColors.warning };
    case 'EXCHANGE_REMINDER':
      return { name: 'time', color: BookLoopColors.burntOrange };
    case 'RATING_RECEIVED':
      return { name: 'star', color: BookLoopColors.mutedGold };
    case 'MESSAGE_RECEIVED':
      return { name: 'mail', color: BookLoopColors.info };
    case 'LISTING_APPROVED':
      return { name: 'checkmark-done-circle', color: BookLoopColors.success };
    case 'LISTING_REJECTED':
      return { name: 'warning', color: BookLoopColors.error };
    case 'SYSTEM_ANNOUNCEMENT':
    default:
      return { name: 'notifications', color: BookLoopColors.coffeeBrown };
  }
};

export function NotificationItem({
  notification,
  onPress,
  onDelete,
}: NotificationItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const icon = getNotificationIcon(notification.type);

  const handlePress = () => {
    onPress?.(notification);
  };

  // Safely format the time, handling invalid dates
  const getFormattedTime = () => {
    try {
      const date = new Date(notification.created_at);
      if (isNaN(date.getTime())) {
        return 'Just now';
      }
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Just now';
    }
  };

  const formattedTime = getFormattedTime();

  return (
    <Pressable onPress={handlePress}>
      <GlassCard style={[styles.container, !notification.is_read && styles.unread]}>
        <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
          <Ionicons name={icon.name} size={24} color={icon.color} />
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text
              style={[
                styles.title,
                { color: colors.text },
                !notification.is_read && styles.unreadText,
              ]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            {!notification.is_read && <View style={styles.unreadDot} />}
          </View>

          <Text
            style={[styles.message, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {notification.message}
          </Text>

          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {formattedTime}
          </Text>
        </View>

        {onDelete && (
          <Pressable
            style={styles.deleteButton}
            onPress={() => onDelete(notification.id)}
            hitSlop={8}
          >
            <Ionicons name="close" size={16} color={colors.textSecondary} />
          </Pressable>
        )}
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
  },
  unread: {
    borderLeftWidth: 3,
    borderLeftColor: BookLoopColors.burntOrange,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    flex: 1,
  },
  unreadText: {
    fontWeight: Typography.fontWeight.bold,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BookLoopColors.burntOrange,
    marginLeft: Spacing.sm,
  },
  message: {
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
    marginBottom: Spacing.xs,
  },
  time: {
    fontSize: Typography.fontSize.xs,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
});
