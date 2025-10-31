import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  BorderRadius,
  Spacing,
  ZIndex,
  AnimationDuration,
} from '@/constants/theme';

/**
 * GlassModal Component
 *
 * Bottom sheet modal with glassmorphic design.
 *
 * Features:
 * - Animated slide up from bottom
 * - Backdrop blur
 * - Swipe to dismiss (optional)
 * - Header with title and close button
 * - Custom content area
 */

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface GlassModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: number | 'auto' | 'full';
  showCloseButton?: boolean;
}

export function GlassModal({
  visible,
  onClose,
  title,
  children,
  height = 'auto',
  showCloseButton = true,
}: GlassModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const modalHeight =
    height === 'full'
      ? SCREEN_HEIGHT
      : height === 'auto'
        ? SCREEN_HEIGHT * 0.8
        : height;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <BlurView
          intensity={50}
          tint={colorScheme === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      </TouchableOpacity>

      {/* Modal Content */}
      <View style={styles.container} pointerEvents="box-none">
        <TouchableOpacity
          activeOpacity={1}
          style={[
            styles.content,
            {
              height: modalHeight,
              backgroundColor: colors.background,
              borderTopLeftRadius: BorderRadius['2xl'],
              borderTopRightRadius: BorderRadius['2xl'],
            },
          ]}
        >
          {/* Handle Bar */}
          <View style={styles.handleBar}>
            <View
              style={[
                styles.handle,
                { backgroundColor: colors.textSecondary },
              ]}
            />
          </View>

          {/* Header */}
          {(title || showCloseButton) && (
            <View style={styles.header}>
              {title && (
                <Text
                  style={[
                    styles.title,
                    {
                      color: colors.text,
                      fontSize: Typography.fontSize.xl,
                    },
                  ]}
                >
                  {title}
                </Text>
              )}
              {showCloseButton && (
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={[styles.closeText, { color: colors.primary }]}>
                    ✕
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Content */}
          <View style={styles.body}>{children}</View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: ZIndex.modalBackdrop,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: ZIndex.modal,
  },
  content: {
    width: '100%',
    overflow: 'hidden',
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: BorderRadius.full,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontWeight: Typography.fontWeight.semibold,
    flex: 1,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  closeText: {
    fontSize: Typography.fontSize['2xl'],
    lineHeight: Typography.fontSize['2xl'],
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
});
