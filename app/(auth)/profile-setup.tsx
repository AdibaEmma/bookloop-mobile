/**
 * Profile Setup Screen
 *
 * Optional profile completion after registration.
 *
 * Features:
 * - Avatar upload
 * - Bio/description
 * - Location sharing
 * - Skip option
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { GlassButton, GlassInput, GlassCard } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { usersService } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePreventBack } from '@/hooks/usePreventBack';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  BookLoopColors,
} from '@/constants/theme';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);

  // Prevent going back after reaching profile setup screen
  usePreventBack();

  /**
   * Pick avatar image
   */
  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to upload an avatar',
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  /**
   * Enable location sharing
   */
  const enableLocation = async () => {
    try {
      setIsLocationLoading(true);

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location access is needed to find books near you',
        );
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({});

      // Update user location
      await usersService.updateLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      setLocationEnabled(true);
      Alert.alert('Success', 'Location enabled successfully');
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get location');
    } finally {
      setIsLocationLoading(false);
    }
  };

  /**
   * Complete profile setup
   */
  const handleComplete = async () => {
    try {
      setIsUploading(true);

      // Upload avatar if selected
      if (avatarUri) {
        const fileName = avatarUri.split('/').pop() || 'avatar.jpg';
        const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

        await usersService.uploadAvatar({
          uri: avatarUri,
          type: fileType,
          name: fileName,
        });
      }

      // Update bio if provided
      if (bio.trim()) {
        await usersService.updateProfile({ bio: bio.trim() });
      }

      // Refresh user data
      await refreshUser();

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Profile setup error:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Skip profile setup
   */
  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
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

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Ionicons
                  name="person-circle"
                  size={48}
                  color={BookLoopColors.burntOrange}
                />
                <Text style={[styles.title, { color: colors.text }]}>
                  Complete Your Profile
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Help others get to know you
                </Text>
              </View>

              {/* Skip Button */}
              <GlassButton
                title="Skip"
                onPress={handleSkip}
                variant="ghost"
                size="sm"
                style={styles.skipButton}
              />
            </View>

            {/* Form */}
            <GlassCard variant="lg" padding="lg">
              <View style={styles.form}>
                {/* Avatar Upload */}
                <View style={styles.avatarSection}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    Profile Photo
                  </Text>
                  <TouchableOpacity
                    onPress={pickImage}
                    style={styles.avatarContainer}
                  >
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.avatar} />
                    ) : (
                      <View
                        style={[
                          styles.avatarPlaceholder,
                          { backgroundColor: colors.surface },
                        ]}
                      >
                        <Ionicons
                          name="camera"
                          size={32}
                          color={colors.textSecondary}
                        />
                      </View>
                    )}
                    <View
                      style={[
                        styles.avatarBadge,
                        { backgroundColor: BookLoopColors.burntOrange },
                      ]}
                    >
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    Tap to upload a photo
                  </Text>
                </View>

                {/* Bio */}
                <GlassInput
                  label="Bio (Optional)"
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell us about yourself and your reading interests..."
                  multiline
                  numberOfLines={4}
                  maxLength={200}
                  showCharCount
                />

                {/* Location Permission */}
                <View style={styles.locationSection}>
                  <View style={styles.locationHeader}>
                    <Ionicons
                      name="location"
                      size={24}
                      color={BookLoopColors.burntOrange}
                    />
                    <View style={styles.locationText}>
                      <Text style={[styles.locationTitle, { color: colors.text }]}>
                        Enable Location
                      </Text>
                      <Text
                        style={[
                          styles.locationDescription,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Find books near you and connect with local readers
                      </Text>
                    </View>
                  </View>

                  {locationEnabled ? (
                    <View style={styles.locationEnabled}>
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={colors.success}
                      />
                      <Text
                        style={[styles.locationEnabledText, { color: colors.success }]}
                      >
                        Enabled
                      </Text>
                    </View>
                  ) : (
                    <GlassButton
                      title="Enable"
                      onPress={enableLocation}
                      variant="secondary"
                      size="sm"
                      loading={isLocationLoading}
                      disabled={isLocationLoading}
                    />
                  )}
                </View>

                {/* Complete Button */}
                <GlassButton
                  title="Complete Setup"
                  onPress={handleComplete}
                  variant="primary"
                  size="lg"
                  loading={isUploading}
                  disabled={isUploading}
                  style={styles.completeButton}
                />
              </View>
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  header: {
    marginBottom: Spacing.xl,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.body,
  },
  skipButton: {
    alignSelf: 'flex-end',
  },
  form: {
    gap: Spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    fontSize: Typography.fontSize.sm,
    marginTop: Spacing.sm,
  },
  locationSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.md,
  },
  locationText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  locationTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  locationDescription: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 18,
  },
  locationEnabled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  locationEnabledText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  completeButton: {
    marginTop: Spacing.md,
  },
});
