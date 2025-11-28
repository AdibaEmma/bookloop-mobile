/**
 * Custom Alert/Toast Component
 *
 * Beautiful themed alerts that match the BookLoop glassmorphic design.
 * Supports dark mode and multiple types (success, error, warning, info).
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BookLoopColors, Typography, Spacing } from '@/constants/theme';

const { width } = Dimensions.get('window');

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertConfig {
  type: AlertType;
  title?: string;
  message: string;
  duration?: number;
  position?: 'top' | 'bottom';
  onPress?: () => void;
  onHide?: () => void;
}

interface AlertProps extends AlertConfig {
  visible: boolean;
  onDismiss: () => void;
}

const ALERT_CONFIG = {
  success: {
    icon: 'checkmark-circle' as const,
    lightColor: '#10B981',
    darkColor: '#34D399',
    lightBg: 'rgba(16, 185, 129, 0.1)',
    darkBg: 'rgba(52, 211, 153, 0.15)',
  },
  error: {
    icon: 'close-circle' as const,
    lightColor: '#EF4444',
    darkColor: '#F87171',
    lightBg: 'rgba(239, 68, 68, 0.1)',
    darkBg: 'rgba(248, 113, 113, 0.15)',
  },
  warning: {
    icon: 'warning' as const,
    lightColor: '#F59E0B',
    darkColor: '#FBBF24',
    lightBg: 'rgba(245, 158, 11, 0.1)',
    darkBg: 'rgba(251, 191, 36, 0.15)',
  },
  info: {
    icon: 'information-circle' as const,
    lightColor: '#3B82F6',
    darkColor: '#60A5FA',
    lightBg: 'rgba(59, 130, 246, 0.1)',
    darkBg: 'rgba(96, 165, 250, 0.15)',
  },
};

export const Alert: React.FC<AlertProps> = ({
  visible,
  type,
  title,
  message,
  duration = 4000,
  position = 'top',
  onPress,
  onDismiss,
  onHide,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(position === 'top' ? -200 : 200);
  const opacity = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const config = ALERT_CONFIG[type];
  const isDark = colorScheme === 'dark';

  const dismissAlert = useCallback(() => {
    onDismiss();
    if (onHide) {
      onHide();
    }
  }, [onDismiss, onHide]);

  const handleHide = useCallback(() => {
    translateY.value = withTiming(position === 'top' ? -200 : 200, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(dismissAlert)();
      }
    });
  }, [position, dismissAlert]);

  useEffect(() => {
    if (visible) {
      // Show animation
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 120,
      });
      opacity.value = withTiming(1, { duration: 300 });

      // Auto-hide after duration
      if (duration > 0) {
        timerRef.current = setTimeout(() => {
          handleHide();
        }, duration);
      }
    } else {
      handleHide();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [visible, duration, handleHide]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
    handleHide();
  };

  if (!visible) return null;

  const topOffset = position === 'top' ? insets.top + 10 : undefined;
  const bottomOffset = position === 'bottom' ? insets.bottom + 10 : undefined;

  return (
    <Animated.View
      style={[
        styles.container,
        position === 'top' ? { top: topOffset } : { bottom: bottomOffset },
        animatedStyle,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={styles.touchable}
      >
        <BlurView
          intensity={isDark ? 40 : 30}
          tint={isDark ? 'dark' : 'light'}
          style={styles.blurContainer}
        >
          <View
            style={[
              styles.content,
              {
                backgroundColor: isDark
                  ? `${config.darkBg}`
                  : `${config.lightBg}`,
                borderColor: isDark ? config.darkColor : config.lightColor,
              },
            ]}
          >
            {/* Icon */}
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: isDark
                    ? `${config.darkColor}25`
                    : `${config.lightColor}25`,
                },
              ]}
            >
              <Ionicons
                name={config.icon}
                size={24}
                color={isDark ? config.darkColor : config.lightColor}
              />
            </View>

            {/* Text Content */}
            <View style={styles.textContainer}>
              {title && (
                <Text
                  style={[
                    styles.title,
                    {
                      color: isDark
                        ? BookLoopColors.cream
                        : BookLoopColors.deepBrown,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
              )}
              <Text
                style={[
                  styles.message,
                  {
                    color: isDark
                      ? BookLoopColors.lightPeach
                      : BookLoopColors.charcoal,
                  },
                ]}
                numberOfLines={2}
              >
                {message}
              </Text>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              onPress={handleHide}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close"
                size={20}
                color={isDark ? BookLoopColors.lightPeach : BookLoopColors.charcoal}
                style={{ opacity: 0.6 }}
              />
            </TouchableOpacity>
          </View>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: Spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  touchable: {
    width: '100%',
  },
  blurContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
    marginBottom: 2,
  },
  message: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.body,
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
  },
});
