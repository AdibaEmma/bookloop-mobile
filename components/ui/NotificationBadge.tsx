/**
 * NotificationBadge Component
 *
 * Displays unread notification count as a badge.
 * Can be used on icons in headers or tab bars.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useNotifications } from '@/contexts/NotificationContext';
import { IconSymbol } from './icon-symbol';
import { BookLoopColors, BorderRadius, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface NotificationBadgeProps {
  size?: number;
  showIcon?: boolean;
  onPress?: () => void;
}

export function NotificationBadge({
  size = 24,
  showIcon = true,
  onPress,
}: NotificationBadgeProps) {
  const { unreadCount } = useNotifications();
  const colorScheme = useColorScheme();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/notifications');
    }
  };

  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      {showIcon && (
        <IconSymbol
          name="bell.fill"
          size={size}
          color={
            colorScheme === 'light'
              ? BookLoopColors.coffeeBrown
              : BookLoopColors.burntOrange
          }
        />
      )}
      {unreadCount > 0 && (
        <View
          style={[
            styles.badge,
            {
              minWidth: unreadCount > 9 ? 20 : 18,
              right: showIcon ? -6 : 0,
              top: showIcon ? -4 : 0,
            },
          ]}
        >
          <Text style={styles.badgeText}>{displayCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * NotificationDot Component
 *
 * Simple dot indicator for unread notifications.
 */
export function NotificationDot() {
  const { unreadCount } = useNotifications();

  if (unreadCount === 0) return null;

  return <View style={styles.dot} />;
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    backgroundColor: BookLoopColors.error,
    borderRadius: BorderRadius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.xs - 2,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
  },
  dot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BookLoopColors.error,
  },
});
