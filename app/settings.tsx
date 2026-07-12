/**
 * Settings Screen
 *
 * App settings and user account management.
 *
 * Features:
 * - Notification preferences
 * - Account settings
 * - Privacy settings
 * - Subscription management
 * - About/Support
 * - Logout
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard, GlassButton, ConfirmModal } from '@/components/ui';
import { showSuccessToastMessage, showErrorToastMessage, showInfoToastMessage } from '@/utils/errorHandler';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';
import biometricService, { BiometricCapability, StoredCredentials } from '@/services/biometric.service';
import { TokenManager } from '@/services/api';

interface SettingItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  type: 'toggle' | 'navigation' | 'action';
  value?: boolean;
  onPress?: () => void;
  onValueChange?: (value: boolean) => void;
  route?: string;
  destructive?: boolean;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Notification preferences
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [exchangeUpdates, setExchangeUpdates] = useState(true);
  const [newMessages, setNewMessages] = useState(true);
  const [nearbyListings, setNearbyListings] = useState(false);

  // Privacy settings
  const [locationSharing, setLocationSharing] = useState(true);
  const [profileVisibility, setProfileVisibility] = useState(true);

  // Biometric settings
  const [biometricCapability, setBiometricCapability] = useState<BiometricCapability | null>(null);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  // Account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /**
   * Check biometric availability on mount
   */
  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const capability = await biometricService.checkBiometricCapability();
      setBiometricCapability(capability);

      if (capability.isAvailable && capability.isEnrolled) {
        const enabled = await biometricService.isBiometricEnabled();
        setIsBiometricEnabled(enabled);
      }
    } catch (error) {
      console.error('Failed to check biometric availability:', error);
    }
  };

  /**
   * Handle biometric toggle
   */
  const handleBiometricToggle = async (value: boolean) => {
    if (isBiometricLoading) return;

    setIsBiometricLoading(true);

    try {
      if (value) {
        // Enable biometric
        if (!user) {
          showErrorToastMessage('You must be logged in to enable biometric login.', 'Not signed in');
          return;
        }

        // Store the REFRESH token — biometric login exchanges it for a fresh
        // session later. An access token would expire within minutes.
        const token = await TokenManager.getRefreshToken();
        if (!token) {
          showErrorToastMessage('No active session found. Please log in again.', 'Session missing');
          return;
        }

        const credentials: StoredCredentials = {
          phone: user.phone || '',
          userId: user.id,
          token,
        };

        const success = await biometricService.enableBiometric(credentials);
        if (success) {
          setIsBiometricEnabled(true);
          showSuccessToastMessage(
            `${biometricService.getBiometricTypeName(biometricCapability?.biometricType || 'fingerprint')} login enabled`,
            'Biometric login',
          );
        }
      } else {
        // Disable biometric
        const success = await biometricService.disableBiometric();
        if (success) {
          setIsBiometricEnabled(false);
          showSuccessToastMessage('Biometric login disabled', 'Biometric login');
        }
      }
    } catch (error) {
      console.error('Failed to toggle biometric:', error);
      showErrorToastMessage('Could not update biometric settings. Please try again.', 'Biometric login');
    } finally {
      setIsBiometricLoading(false);
    }
  };

  /**
   * Get biometric icon based on type
   */
  const getBiometricIcon = (): keyof typeof Ionicons.glyphMap => {
    if (!biometricCapability) return 'finger-print';

    switch (biometricCapability.biometricType) {
      case 'facial':
        return Platform.OS === 'ios' ? 'scan' : 'happy';
      case 'fingerprint':
        return 'finger-print';
      case 'iris':
        return 'eye';
      default:
        return 'finger-print';
    }
  };

  /**
   * Handle delete account
   */
  const handleDeleteAccount = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAccount = () => {
    setShowDeleteConfirm(false);
    showInfoToastMessage(
      'Account deletion is coming soon. Contact support to delete your account today.',
      'Not available yet',
    );
  };

  const notificationSettings: SettingItem[] = [
    {
      id: 'push',
      title: 'Push Notifications',
      icon: 'notifications',
      type: 'toggle',
      value: pushNotifications,
      onValueChange: setPushNotifications,
    },
    {
      id: 'email',
      title: 'Email Notifications',
      icon: 'mail',
      type: 'toggle',
      value: emailNotifications,
      onValueChange: setEmailNotifications,
    },
    {
      id: 'exchange',
      title: 'Exchange Updates',
      icon: 'swap-horizontal',
      type: 'toggle',
      value: exchangeUpdates,
      onValueChange: setExchangeUpdates,
    },
    {
      id: 'messages',
      title: 'New Messages',
      icon: 'chatbubble',
      type: 'toggle',
      value: newMessages,
      onValueChange: setNewMessages,
    },
    {
      id: 'nearby',
      title: 'Nearby Listings',
      icon: 'location',
      type: 'toggle',
      value: nearbyListings,
      onValueChange: setNearbyListings,
    },
  ];

  const accountSettings: SettingItem[] = [
    {
      id: 'profile',
      title: 'Edit Profile',
      icon: 'person',
      type: 'navigation',
      route: '/profile/edit',
    },
    {
      id: 'subscription',
      title: 'Subscription',
      icon: 'card',
      type: 'navigation',
      route: '/subscription',
    },
    {
      id: 'payment',
      title: 'Payment Methods',
      icon: 'wallet',
      type: 'navigation',
      route: '/payment-methods',
    },
    {
      id: 'password',
      title: 'Change Password',
      icon: 'lock-closed',
      type: 'navigation',
      route: '/change-password',
    },
  ];

  // Build privacy settings dynamically to include biometric if available
  const privacySettings: SettingItem[] = [
    // Only show biometric toggle if device supports it
    ...(biometricCapability?.isAvailable && biometricCapability.isEnrolled
      ? [
          {
            id: 'biometric',
            title: `${biometricService.getBiometricTypeName(biometricCapability.biometricType)} Login`,
            icon: getBiometricIcon(),
            type: 'toggle' as const,
            value: isBiometricEnabled,
            onValueChange: handleBiometricToggle,
          },
        ]
      : []),
    {
      id: 'location',
      title: 'Location Sharing',
      icon: 'location',
      type: 'toggle',
      value: locationSharing,
      onValueChange: setLocationSharing,
    },
    {
      id: 'profile',
      title: 'Profile Visibility',
      icon: 'eye',
      type: 'toggle',
      value: profileVisibility,
      onValueChange: setProfileVisibility,
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      icon: 'shield-checkmark',
      type: 'navigation',
      onPress: () => showInfoToastMessage('Privacy policy is coming soon.', 'Not available yet'),
    },
    {
      id: 'terms',
      title: 'Terms of Service',
      icon: 'document-text',
      type: 'navigation',
      onPress: () => showInfoToastMessage('Terms of service are coming soon.', 'Not available yet'),
    },
  ];

  const supportSettings: SettingItem[] = [
    {
      id: 'help',
      title: 'Help & Support',
      icon: 'help-circle',
      type: 'navigation',
      onPress: () => showInfoToastMessage('Email us at support@bookloop.app', 'Support'),
    },
    {
      id: 'feedback',
      title: 'Send Feedback',
      icon: 'chatbubble-ellipses',
      type: 'navigation',
      onPress: () => showInfoToastMessage('The feedback form is coming soon.', 'Not available yet'),
    },
    {
      id: 'about',
      title: 'About BookLoop',
      icon: 'information-circle',
      type: 'navigation',
      onPress: () => showInfoToastMessage('Version 1.0.0', 'BookLoop'),
    },
  ];

  /**
   * Render setting item
   */
  const renderSettingItem = (item: SettingItem) => {
    if (item.type === 'toggle') {
      return (
        <View key={item.id} style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name={item.icon} size={20} color={colors.text} />
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              {item.title}
            </Text>
          </View>
          <Switch
            value={item.value}
            onValueChange={item.onValueChange}
            trackColor={{
              false: colors.surface,
              true: BookLoopColors.burntOrange,
            }}
            thumbColor="#FFFFFF"
          />
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={item.id}
        onPress={item.onPress || (() => item.route && router.push(item.route as any))}
        style={styles.settingItem}
      >
        <View style={styles.settingLeft}>
          <Ionicons
            name={item.icon}
            size={20}
            color={item.destructive ? BookLoopColors.error : colors.text}
          />
          <Text
            style={[
              styles.settingTitle,
              {
                color: item.destructive ? BookLoopColors.error : colors.text,
              },
            ]}
          >
            {item.title}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

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
              Settings
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
          {/* Notifications */}
          <GlassCard variant="lg" padding="md">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Notifications
            </Text>
            {notificationSettings.map(renderSettingItem)}
          </GlassCard>

          {/* Account */}
          <GlassCard variant="lg" padding="md">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Account
            </Text>
            {accountSettings.map(renderSettingItem)}
          </GlassCard>

          {/* Privacy */}
          <GlassCard variant="lg" padding="md">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Privacy & Security
            </Text>
            {privacySettings.map(renderSettingItem)}
          </GlassCard>

          {/* Support */}
          <GlassCard variant="lg" padding="md">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Support & About
            </Text>
            {supportSettings.map(renderSettingItem)}
          </GlassCard>

          {/* Delete Account */}
          <TouchableOpacity
            onPress={handleDeleteAccount}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>

          {/* App Version */}
          <Text style={[styles.version, { color: colors.textSecondary }]}>
            BookLoop v1.0.0
          </Text>
        </ScrollView>
        </SafeAreaView>

        <ConfirmModal
          visible={showDeleteConfirm}
          title="Delete account"
          message="This cannot be undone — all your listings, swaps, and data will be permanently deleted."
          confirmLabel="Delete account"
          destructive
          onConfirm={confirmDeleteAccount}
          onCancel={() => setShowDeleteConfirm(false)}
        />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    padding: Spacing.sm,
    paddingLeft: Spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  settingTitle: {
    fontSize: Typography.fontSize.base,
  },
  deleteButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  deleteText: {
    color: BookLoopColors.error,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  version: {
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
});
