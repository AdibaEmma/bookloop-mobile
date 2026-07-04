/**
 * Ghana Card Verification — design refresh 4d (Step 3 of 4)
 *
 * Manual-entry KYC: the user types their Ghana Card number, which is stored
 * pending admin approval (ghana_card_verified stays false). A camera "scan"
 * (OCR / SourceID auto-verify) is a later enhancement — noted as coming soon.
 *
 * The step is skippable so onboarding isn't blocked; verification can be
 * completed later from the profile.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, Check, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usersService } from '@/services/api';
import { showError } from '@/utils/errorHandler';
import { BookLoopColors } from '@/constants/theme';

/**
 * On-device OCR (MLKit) is a native module, so it only exists in a dev/EAS
 * build — not Expo Go. Load it lazily and degrade to manual entry if absent.
 */
async function recognizeCardNumber(uri: string): Promise<string | null> {
  try {
    const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
    const result = await TextRecognition.recognize(uri);
    const compact = String(result?.text ?? '').replace(/\s+/g, '').toUpperCase();
    const m = compact.match(/GHA-?(\d{9})-?(\d)/);
    return m ? `GHA-${m[1]}-${m[2]}` : null;
  } catch {
    return null; // native module unavailable (Expo Go) or no readable text
  }
}

const C = {
  grad: [BookLoopColors.creamTop, BookLoopColors.cream] as const,
  text: BookLoopColors.deepEspresso,
  muted: BookLoopColors.authorText,
  active: BookLoopColors.coffeeBrown,
  gold: BookLoopColors.mutedGold,
  latte: BookLoopColors.softLatte,
  label: '#6B5240',
};

// GHA-XXXXXXXXX-X
function isValidCard(v: string): boolean {
  return /^GHA-\d{9}-\d$/i.test(v.trim());
}

export default function GhanaCardScreen() {
  const router = useRouter();
  const [card, setCard] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const goNext = () => router.replace('/(auth)/profile-setup');

  const scanCard = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera needed', 'Allow camera access to photograph your Ghana Card.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1586, 1000],
        quality: 0.7,
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      setCapturedUri(asset.uri);
      setScanning(true);

      // Try to read the card number off the photo (dev/EAS build only).
      const detected = await recognizeCardNumber(asset.uri);
      if (detected) {
        setCard(detected);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      const name = asset.uri.split('/').pop() || 'ghana-card.jpg';
      const type = name.endsWith('.png') ? 'image/png' : 'image/jpeg';
      await usersService.uploadGhanaCardImage({ uri: asset.uri, type, name });
      if (!detected) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setCapturedUri(null);
      showError(error, 'Could not upload the photo');
    } finally {
      setScanning(false);
    }
  };

  const submit = async () => {
    if (!isValidCard(card)) return;
    setSubmitting(true);
    try {
      const result: any = await usersService.submitGhanaCard(card.trim().toUpperCase());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // SourceID may auto-verify instantly; otherwise it's pending admin review.
      const verified = result?.ghanaCardVerified ?? result?.ghana_card_verified ?? false;
      Alert.alert(
        verified ? 'Identity verified ✅' : 'Submitted for review',
        verified
          ? 'Your Ghana Card was verified. You’re all set!'
          : 'Thanks! Our team will review your Ghana Card within 24–48 hours.',
        [{ text: 'Continue', onPress: goNext }],
      );
    } catch (error) {
      showError(error, 'Could not submit Ghana Card');
    } finally {
      setSubmitting(false);
    }
  };

  const valid = isValidCard(card);

  return (
    <View style={styles.container}>
      <LinearGradient colors={C.grad} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.body}>
            {/* Back */}
            <TouchableOpacity
              style={styles.back}
              onPress={() => router.back()}
              accessibilityLabel="Back"
            >
              <ArrowLeft size={20} color={C.text} strokeWidth={2} />
            </TouchableOpacity>

            {/* Progress */}
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
            <Text style={styles.step}>Step 3 of 4</Text>

            {/* Heading */}
            <Text style={styles.title}>Verify your identity</Text>
            <Text style={styles.subtitle}>
              Add your Ghana Card so others know they can trust you. This is a one-time check.
            </Text>

            {/* Viewfinder / captured image */}
            <TouchableOpacity style={styles.viewfinder} onPress={scanCard} activeOpacity={0.9}>
              {capturedUri ? (
                <Image source={{ uri: capturedUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <View style={styles.cardMock}>
                  <View style={styles.cardMockRow}>
                    <Text style={styles.cardMockLabel}>GHANA CARD</Text>
                    <View style={styles.cardChip} />
                  </View>
                  <View style={styles.cardPhoto} />
                  <View>
                    <View style={[styles.cardLine, { width: '60%' }]} />
                    <View style={[styles.cardLine, { width: '40%', marginTop: 4 }]} />
                  </View>
                </View>
              )}
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
            </TouchableOpacity>

            {/* Scan button */}
            <TouchableOpacity style={styles.scanBtn} onPress={scanCard} activeOpacity={0.85} disabled={scanning}>
              {scanning ? (
                <ActivityIndicator size="small" color={C.active} />
              ) : capturedUri ? (
                <>
                  <Check size={16} color={BookLoopColors.success} strokeWidth={2.4} />
                  <Text style={styles.scanBtnText}>Photo added — tap to retake</Text>
                </>
              ) : (
                <>
                  <Camera size={16} color={C.active} strokeWidth={2} />
                  <Text style={styles.scanBtnText}>Scan Ghana Card</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Manual entry */}
            <Text style={styles.fieldLabel}>Ghana Card number</Text>
            <TextInput
              value={card}
              onChangeText={(t) => setCard(t.toUpperCase())}
              placeholder="GHA-123456789-0"
              placeholderTextColor={C.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[styles.input, { borderColor: card ? (valid ? C.active : '#E0A0A0') : C.latte }]}
            />

            <View style={{ flex: 1 }} />

            {/* Actions */}
            <TouchableOpacity
              style={[styles.primary, { opacity: valid && !submitting ? 1 : 0.5 }]}
              onPress={submit}
              disabled={!valid || submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color={BookLoopColors.cream} />
              ) : (
                <>
                  <ShieldCheck size={18} color={BookLoopColors.cream} strokeWidth={2} />
                  <Text style={styles.primaryText}>Submit for verification</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.skip} onPress={goNext} activeOpacity={0.7}>
              <Text style={styles.skipText}>I’ll do this later</Text>
            </TouchableOpacity>
            <Text style={styles.note}>Manual entries need admin approval (24–48 hrs)</Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 6, paddingBottom: 20 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(244,225,193,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(139,94,60,0.15)',
    marginTop: 20,
  },
  progressFill: { width: '75%', height: '100%', borderRadius: 2, backgroundColor: C.active },
  step: { fontFamily: 'Inter-Regular', fontSize: 11, color: C.muted, marginTop: 6, fontWeight: '500' },
  title: { fontFamily: 'Poppins-Bold', fontSize: 22, color: C.text, marginTop: 16 },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: BookLoopColors.authorText, marginTop: 5, lineHeight: 19 },
  viewfinder: {
    marginTop: 18,
    aspectRatio: 1.586,
    borderRadius: 18,
    backgroundColor: '#2A231C',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  cardMock: {
    width: '78%',
    height: '70%',
    borderRadius: 10,
    backgroundColor: '#3a3128',
    padding: 11,
    justifyContent: 'space-between',
  },
  cardMockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardMockLabel: { fontFamily: 'Inter-Bold', fontSize: 8, letterSpacing: 0.5, color: '#C9B79C' },
  cardChip: { width: 22, height: 16, borderRadius: 2, backgroundColor: '#5A4B3A' },
  cardPhoto: { width: 44, height: 44, borderRadius: 6, backgroundColor: '#4A3F32' },
  cardLine: { height: 5, borderRadius: 2, backgroundColor: '#4A3F32' },
  corner: { position: 'absolute', width: 26, height: 26, borderColor: C.gold },
  tl: { top: 12, left: 14, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  tr: { top: 12, right: 14, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  bl: { bottom: 12, left: 14, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  br: { bottom: 12, right: 14, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    justifyContent: 'center',
    marginTop: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4C9B6',
    backgroundColor: '#fff',
  },
  scanBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: C.active, fontWeight: '600' },
  fieldLabel: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: C.label, marginTop: 20, marginBottom: 8, fontWeight: '600' },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    letterSpacing: 0.5,
    color: C.text,
  },
  primary: {
    height: 48,
    borderRadius: 12,
    backgroundColor: C.active,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: C.active,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 6,
  },
  primaryText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: BookLoopColors.cream, fontWeight: '600' },
  skip: { height: 44, justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  skipText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: C.active, fontWeight: '600' },
  note: { fontFamily: 'Inter-Regular', fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 2 },
});
