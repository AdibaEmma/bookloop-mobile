/**
 * Edit Profile Screen
 *
 * Allow users to update their profile information.
 *
 * Features:
 * - Update name, bio
 * - Upload/change avatar
 * - Form validation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { GlassCard, GlassButton, GlassInput, Avatar } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { usersService } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { showErrorToastMessage, showSuccessToastMessage } from '@/utils/errorHandler';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  // Errors
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    bio?: string;
  }>({});

  /**
   * Load current profile data
   */
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setBio((user as any).bio || '');
      setAvatarUrl(user.avatarUrl);
    }
  }, [user]);

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    if (bio && bio.length > 500) {
      newErrors.bio = 'Bio must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle avatar selection
   */
  const handleSelectAvatar = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to change your avatar.');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        setIsUploadingAvatar(true);

        try {
          // Upload avatar
          const response = await usersService.uploadAvatar({
            uri: asset.uri,
            type: asset.mimeType || 'image/jpeg',
            name: asset.fileName || 'avatar.jpg',
          });

          setAvatarUrl(response.url);
          showSuccessToastMessage('Avatar updated successfully', 'Success');
        } catch (uploadError) {
          showErrorToastMessage(uploadError, 'Failed to upload avatar');
        } finally {
          setIsUploadingAvatar(false);
        }
      }
    } catch (error) {
      console.error('Failed to select avatar:', error);
      showErrorToastMessage(error, 'Failed to select image');
    }
  };

  /**
   * Handle save profile
   */
  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    setIsSaving(true);

    try {
      await usersService.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim() || undefined,
      });

      // Refresh user data in context
      await refreshUser();

      showSuccessToastMessage('Profile updated successfully', 'Success');
      router.back();
    } catch (error) {
      showErrorToastMessage(error, 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <LinearGradient
          colors={
            colorScheme === 'light'
              ? [BookLoopColors.cream, BookLoopColors.lightPeach]
              : [BookLoopColors.deepBrown, BookLoopColors.charcoal]
          }
          style={StyleSheet.absoluteFillObject}
        />
        <ActivityIndicator size="large" color={BookLoopColors.burntOrange} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Profile',
          headerShown: true,
        }}
      />

      <View style={styles.container}>
        <LinearGradient
          colors={
            colorScheme === 'light'
              ? [BookLoopColors.cream, BookLoopColors.lightPeach]
              : [BookLoopColors.deepBrown, BookLoopColors.charcoal]
          }
          style={StyleSheet.absoluteFillObject}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Section */}
          <GlassCard variant="lg" padding="lg">
            <View style={styles.avatarSection}>
              <TouchableOpacity
                onPress={handleSelectAvatar}
                disabled={isUploadingAvatar}
                style={styles.avatarContainer}
              >
                {isUploadingAvatar ? (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
                    <ActivityIndicator size="small" color={BookLoopColors.burntOrange} />
                  </View>
                ) : (
                  <Avatar
                    imageUrl={avatarUrl}
                    name={`${firstName} ${lastName}`}
                    size={100}
                  />
                )}

                <View style={[styles.editBadge, { backgroundColor: BookLoopColors.burntOrange }]}>
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <Text style={[styles.avatarHint, { color: colors.textSecondary }]}>
                Tap to change photo
              </Text>
            </View>
          </GlassCard>

          {/* Profile Form */}
          <GlassCard variant="lg" padding="lg">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Personal Information
            </Text>

            <View style={styles.form}>
              <GlassInput
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter your first name"
                autoCapitalize="words"
                error={errors.firstName}
                leftIcon="person"
              />

              <GlassInput
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter your last name"
                autoCapitalize="words"
                error={errors.lastName}
                leftIcon="person-outline"
              />

              <GlassInput
                label="Bio"
                value={bio}
                onChangeText={setBio}
                placeholder="Tell others about yourself..."
                multiline
                numberOfLines={4}
                maxLength={500}
                showCharCount
                error={errors.bio}
              />
            </View>
          </GlassCard>

          {/* Account Info (Read-only) */}
          <GlassCard variant="lg" padding="lg">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Account Information
            </Text>

            <View style={styles.infoRow}>
              <Ionicons name="mail" size={20} color={colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="call" size={20} color={colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Phone</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{user.phone}</Text>
              </View>
            </View>

            <Text style={[styles.infoNote, { color: colors.textSecondary }]}>
              Contact support to update your email or phone number.
            </Text>
          </GlassCard>

          {/* Save Button */}
          <GlassButton
            title="Save Changes"
            onPress={handleSave}
            variant="primary"
            size="lg"
            loading={isSaving}
            disabled={isSaving}
            icon="checkmark"
          />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  avatarSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarHint: {
    fontSize: Typography.fontSize.sm,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.md,
  },
  form: {
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: Typography.fontSize.xs,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: Typography.fontSize.base,
  },
  infoNote: {
    fontSize: Typography.fontSize.xs,
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },
});
