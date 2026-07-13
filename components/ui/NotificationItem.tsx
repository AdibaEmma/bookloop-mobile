/**
 * NotificationItem
 *
 * One notification row. The icon + tint encode the notification *type* so the
 * list is scannable at a glance (a request, a cancellation and a rating never
 * look the same). Unread rows carry a warm tint, a left accent and a dot; read
 * rows sit quiet. Solid card on the warm page so the text stays readable.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  Star,
  Ban,
  Clock,
  MessageCircle,
  BadgeCheck,
  AlertTriangle,
  Megaphone,
  Bell,
  X,
} from 'lucide-react-native';
import { BookLoopColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Notification } from '@/services/api/notifications.service';

interface NotificationItemProps {
  notification: Notification;
  onPress?: (notification: Notification) => void;
  onDelete?: (notificationId: string) => void;
}

type IconType = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

// Keyed on the backend's lowercase NotificationType values. Warm-leaning colors
// with a couple of semantic exceptions (green accepted, red declined).
const META: Record<string, { Icon: IconType; color: string }> = {
  exchange_request: { Icon: ArrowLeftRight, color: '#8B5E3C' },
  exchange_accepted: { Icon: CheckCircle2, color: '#3F9A6A' },
  exchange_declined: { Icon: XCircle, color: '#C7492F' },
  exchange_completed: { Icon: Star, color: '#C0891F' },
  exchange_cancelled: { Icon: Ban, color: '#B4762E' },
  exchange_reminder: { Icon: Clock, color: '#D97941' },
  rating_received: { Icon: Star, color: '#C0891F' },
  message_received: { Icon: MessageCircle, color: '#4F6B8C' },
  listing_approved: { Icon: BadgeCheck, color: '#3F9A6A' },
  listing_rejected: { Icon: AlertTriangle, color: '#C7492F' },
  system_announcement: { Icon: Megaphone, color: '#8B5E3C' },
};
const FALLBACK = { Icon: Bell, color: BookLoopColors.coffeeBrown };

function metaFor(type?: string) {
  return (type && META[type.toLowerCase()]) || FALLBACK;
}

export function NotificationItem({ notification, onPress, onDelete }: NotificationItemProps) {
  const isDark = (useColorScheme() ?? 'light') === 'dark';
  const { Icon, color } = metaFor(notification.type);
  const unread = !notification.isRead;

  const c = isDark
    ? {
        card: BookLoopColors.darkSurface,
        unreadCard: BookLoopColors.darkSurfaceRaised,
        border: BookLoopColors.darkBorder,
        title: BookLoopColors.darkText,
        message: '#B7A891',
        time: '#8C7B64',
        del: '#8C7B64',
      }
    : {
        card: '#FFFFFF',
        unreadCard: '#FFFBF4',
        border: '#EFE2CE',
        title: BookLoopColors.deepEspresso,
        message: '#7C6B54',
        time: '#B0A088',
        del: '#B8A78E',
      };

  const formattedTime = (() => {
    try {
      const date = new Date(notification.createdAt);
      if (isNaN(date.getTime())) return 'Just now';
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Just now';
    }
  })();

  return (
    <Pressable onPress={() => onPress?.(notification)} style={styles.wrap}>
      <View
        style={[
          styles.card,
          { backgroundColor: unread ? c.unreadCard : c.card, borderColor: c.border },
          unread && { borderLeftWidth: 3.5, borderLeftColor: color },
        ]}
      >
        <View style={[styles.iconTile, { backgroundColor: `${color}22` }]}>
          <Icon size={20} color={color} strokeWidth={2} />
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text
              style={[styles.title, { color: c.title }, unread && styles.titleUnread]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            {/* Time lives in the title row — inbox-scannable, saves a line */}
            <Text style={[styles.time, { color: c.time }]}>{formattedTime}</Text>
            {unread && <View style={[styles.dot, { backgroundColor: color }]} />}
          </View>

          <Text style={[styles.message, { color: c.message }]} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>

        {onDelete && (
          <Pressable
            style={styles.delete}
            onPress={() => onDelete(notification.id)}
            hitSlop={10}
            accessibilityLabel="Dismiss notification"
          >
            <X size={16} color={c.del} strokeWidth={2} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginVertical: 5,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 15,
    borderWidth: 1,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 1,
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 14.5,
    fontWeight: '600',
  },
  titleUnread: {
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  message: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 4,
  },
  time: {
    fontFamily: 'Inter-Regular',
    fontSize: 10.5,
    fontWeight: '500',
    flexShrink: 0,
  },
  delete: {
    padding: 2,
    marginLeft: 2,
  },
});
