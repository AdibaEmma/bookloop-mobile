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

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard, GlassButton } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';

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

  /**
   * Handle delete account
   */
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Coming Soon',
              'Account deletion will be available soon. Please contact support for now.'
            );
          },
        },
      ]
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

  const privacySettings: SettingItem[] = [
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
      onPress: () => Alert.alert('Coming Soon', 'Privacy policy coming soon'),
    },
    {
      id: 'terms',
      title: 'Terms of Service',
      icon: 'document-text',
      type: 'navigation',
      onPress: () => Alert.alert('Coming Soon', 'Terms of service coming soon'),
    },
  ];

  const supportSettings: SettingItem[] = [
    {
      id: 'help',
      title: 'Help & Support',
      icon: 'help-circle',
      type: 'navigation',
      onPress: () => Alert.alert('Support', 'Email: support@bookloop.app'),
    },
    {
      id: 'feedback',
      title: 'Send Feedback',
      icon: 'chatbubble-ellipses',
      type: 'navigation',
      onPress: () => Alert.alert('Coming Soon', 'Feedback form coming soon'),
    },
    {
      id: 'about',
      title: 'About BookLoop',
      icon: 'information-circle',
      type: 'navigation',
      onPress: () => Alert.alert('BookLoop', 'Version 1.0.0'),
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
            color={item.destructive ? '#FF3B30' : colors.text}
          />
          <Text
            style={[
              styles.settingTitle,
              {
                color: item.destructive ? '#FF3B30' : colors.text,
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
    color: '#FF3B30',
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
