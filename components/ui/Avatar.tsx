import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  BorderRadius,
} from '@/constants/theme';

/**
 * Avatar Component
 *
 * User avatar with fallback to initials.
 *
 * Features:
 * - Image avatar
 * - Initials fallback
 * - Size variants
 * - Status indicator (online/offline)
 * - Badge (verified, etc.)
 */

interface AvatarProps {
  imageUrl?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  isOnline?: boolean;
  verified?: boolean;
  style?: ViewStyle;
}

export function Avatar({
  imageUrl,
  name,
  size = 'md',
  showStatus = false,
  isOnline = false,
  verified = false,
  style,
}: AvatarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const sizes = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
  };

  const avatarSize = sizes[size];
  const fontSize = {
    xs: Typography.fontSize.xs,
    sm: Typography.fontSize.sm,
    md: Typography.fontSize.base,
    lg: Typography.fontSize.xl,
    xl: Typography.fontSize['3xl'],
  }[size];

  // Get initials from name
  const getInitials = (fullName: string): string => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const initials = getInitials(name);

  // Generate consistent color from name
  const getColorFromName = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 60%, 50%)`;
  };

  const backgroundColor = getColorFromName(name);

  return (
    <View style={[styles.container, style]}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[
            styles.avatar,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.avatar,
            styles.initialsContainer,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              backgroundColor,
            },
          ]}
        >
          <Text
            style={[
              styles.initials,
              {
                fontSize,
                color: '#FFFFFF',
              },
            ]}
          >
            {initials}
          </Text>
        </View>
      )}

      {/* Status Indicator */}
      {showStatus && (
        <View
          style={[
            styles.statusIndicator,
            {
              width: avatarSize * 0.25,
              height: avatarSize * 0.25,
              borderRadius: avatarSize * 0.125,
              backgroundColor: isOnline ? colors.success : colors.textSecondary,
              borderColor: colors.background,
            },
          ]}
        />
      )}

      {/* Verified Badge */}
      {verified && (
        <View
          style={[
            styles.verifiedBadge,
            {
              width: avatarSize * 0.35,
              height: avatarSize * 0.35,
              borderRadius: avatarSize * 0.175,
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Ionicons
            name="checkmark"
            size={avatarSize * 0.2}
            color="#FFFFFF"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatar: {
    overflow: 'hidden',
  },
  initialsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontWeight: Typography.fontWeight.semibold,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
