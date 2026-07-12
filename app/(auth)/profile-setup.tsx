/**
 * Profile Setup — design refresh 4e (Step 4 of 4)
 *
 * Avatar, full name (pre-filled, editable) and location, then into the app.
 * Preserves the original save logic (avatar upload, profile update, location).
 * Username is omitted — the User model has no username column yet.
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
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Camera, MapPin, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { usersService } from '@/services/api';
import { usePreventBack } from '@/hooks/usePreventBack';
import { reverseGeocode } from '@/utils/geocode';
import { showErrorToastMessage, showInfoToastMessage } from '@/utils/errorHandler';
import { BookLoopColors } from '@/constants/theme';

const C = {
  grad: [BookLoopColors.creamTop, BookLoopColors.cream] as const,
  text: BookLoopColors.deepEspresso,
  muted: BookLoopColors.authorText,
  active: BookLoopColors.coffeeBrown,
  latte: BookLoopColors.softLatte,
  label: '#6B5240',
  fieldBg: 'rgba(244,225,193,0.35)',
};

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
  );
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  usePreventBack();

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showInfoToastMessage('Allow photo access to add a profile photo.', 'Permission needed');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
    } catch (error) {
      console.error('Image picker error:', error);
    }
  };

  const enableLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showInfoToastMessage('Location helps you find books nearby.', 'Permission needed');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      await usersService.updateLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      // Best-effort human-readable label (cached + rate-limit safe)
      const place = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      setLocationLabel(
        [place?.district || place?.subregion || place?.name, place?.city]
          .filter(Boolean)
          .join(', ') || 'Location set',
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Location error:', error);
      showErrorToastMessage('Could not get your location. Check location settings and try again.', 'Location failed');
    } finally {
      setIsLocating(false);
    }
  };

  const handleComplete = async () => {
    try {
      setSaving(true);

      if (avatarUri) {
        const fileName = avatarUri.split('/').pop() || 'avatar.jpg';
        const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
        await usersService.uploadAvatar({ uri: avatarUri, type: fileType, name: fileName });
      }

      const parts = fullName.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 1) {
        await usersService.updateProfile({
          firstName: parts[0],
          lastName: parts.length > 1 ? parts.slice(1).join(' ') : parts[0],
        });
      }

      await refreshUser();
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Profile setup error:', error);
      showErrorToastMessage(error?.message || 'Could not save your profile. Please try again.', 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const initials =
    ((user?.firstName?.charAt(0) || '') + (user?.lastName?.charAt(0) || '')).toUpperCase();
  const firstName = user?.firstName || 'there';

  return (
    <View style={styles.container}>
      <LinearGradient colors={C.grad} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {/* Progress */}
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
            <Text style={styles.step}>Step 4 of 4</Text>

            <Text style={styles.title}>Set up your profile</Text>
            <Text style={styles.subtitle}>Almost done, {firstName} — this is how neighbours will see you.</Text>

            {/* Avatar */}
            <View style={styles.avatarWrap}>
              <TouchableOpacity style={styles.avatar} onPress={pickImage} activeOpacity={0.8}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                ) : initials ? (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                ) : (
                  <User size={30} color="#B39C82" strokeWidth={1.8} />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cameraBadge} onPress={pickImage} activeOpacity={0.8}>
                <Camera size={15} color={BookLoopColors.cream} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Full name */}
            <Text style={styles.fieldLabel}>Full name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Kwame Mensah"
              placeholderTextColor={C.muted}
              autoCapitalize="words"
              style={styles.input}
            />

            {/* Location */}
            <Text style={styles.fieldLabel}>Location</Text>
            <TouchableOpacity
              style={styles.locationRow}
              onPress={enableLocation}
              activeOpacity={0.8}
              disabled={isLocating}
            >
              <MapPin size={17} color={C.active} strokeWidth={2} />
              <Text style={[styles.locationText, { color: locationLabel ? C.text : C.muted }]} numberOfLines={1}>
                {isLocating ? 'Detecting…' : locationLabel || 'Use my current location'}
              </Text>
              {isLocating ? (
                <ActivityIndicator size="small" color={C.active} />
              ) : locationLabel ? (
                <Check size={16} color={BookLoopColors.success} strokeWidth={2.4} />
              ) : (
                <Text style={styles.locationAuto}>Auto</Text>
              )}
            </TouchableOpacity>

            <View style={{ flex: 1, minHeight: 20 }} />

            <TouchableOpacity
              style={[styles.primary, { opacity: fullName.trim() && !saving ? 1 : 0.5 }]}
              onPress={handleComplete}
              disabled={!fullName.trim() || saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={BookLoopColors.cream} />
              ) : (
                <Text style={styles.primaryText}>Start exploring</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(139,94,60,0.15)' },
  progressFill: { width: '100%', height: '100%', borderRadius: 2, backgroundColor: C.active },
  step: { fontFamily: 'Inter-Regular', fontSize: 11, color: C.muted, marginTop: 6, fontWeight: '500' },
  title: { fontFamily: 'Poppins-Bold', fontSize: 22, color: C.text, marginTop: 14 },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: BookLoopColors.authorText, marginTop: 4, lineHeight: 19 },
  avatarWrap: { alignSelf: 'center', marginTop: 18, width: 92, height: 92 },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: '#C9A97E',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(244,225,193,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitials: { fontFamily: 'Poppins-Bold', fontSize: 28, color: C.active },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.active,
    borderWidth: 2.5,
    borderColor: BookLoopColors.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldLabel: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: C.label, marginTop: 20, marginBottom: 6, fontWeight: '600' },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.latte,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: C.text,
  },
  locationRow: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.latte,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  locationText: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 15 },
  locationAuto: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: C.active, fontWeight: '600' },
  primary: {
    height: 48,
    borderRadius: 12,
    backgroundColor: C.active,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.active,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 6,
  },
  primaryText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: BookLoopColors.cream, fontWeight: '600' },
});
