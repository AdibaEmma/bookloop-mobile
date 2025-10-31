/**
 * Phone Input Screen
 *
 * Step 1: User registration - collect phone number and names.
 *
 * Features:
 * - Ghana phone number validation
 * - Name inputs (first, last)
 * - Optional email input
 * - Form validation
 * - Send OTP (passwordless)
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassButton, GlassInput, GlassCard } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { showError } from '@/utils/errorHandler';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';

export default function PhoneInputScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  }>({});

  /**
   * Validate Ghana phone number
   * Format: 0XXXXXXXXX (10 digits) or 233XXXXXXXXX (12 digits)
   */
  const validatePhone = (phoneNumber: string): boolean => {
    const cleaned = phoneNumber.replace(/\s+/g, '');
    // Ghana format: starts with 0 and has 10 digits OR starts with 233 and has 12 digits
    return /^0\d{9}$/.test(cleaned) || /^233\d{9}$/.test(cleaned);
  };

  /**
   * Normalize phone number to international format (+233XXXXXXXXX)
   */
  const normalizePhone = (phoneNumber: string): string => {
    const cleaned = phoneNumber.replace(/\s+/g, '');
    if (cleaned.startsWith('0')) {
      return `+233${cleaned.substring(1)}`;
    } else if (cleaned.startsWith('233')) {
      return `+${cleaned}`;
    }
    return cleaned;
  };

  /**
   * Validate email format
   */
  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

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

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(phone)) {
      newErrors.phone = 'Invalid Ghana phone number (e.g., 0241234567)';
    }

    if (email.trim() && !validateEmail(email)) {
      newErrors.email = 'Invalid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle registration
   */
  const handleRegister = async () => {
    if (!validate()) {
      return;
    }

    try {
      const normalizedPhone = normalizePhone(phone);

      await register(
        normalizedPhone,
        firstName.trim(),
        lastName.trim(),
        email.trim() || undefined,
      );

      // Navigate to OTP verification
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          phone: normalizedPhone,
          firstName: firstName.trim(),
          isRegistration: 'true',
        },
      });
    } catch (error: any) {
      showError(error, 'Registration Failed');
    }
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
              <GlassButton
                title=""
                icon="arrow-back"
                onPress={() => router.back()}
                variant="ghost"
                size="md"
                style={styles.backButton}
              />

              <View style={styles.titleContainer}>
                <Ionicons
                  name="person-add"
                  size={48}
                  color={BookLoopColors.burntOrange}
                />
                <Text style={[styles.title, { color: colors.text }]}>
                  Create Account
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Join BookLoop to start exchanging books
                </Text>
              </View>
            </View>

            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: BookLoopColors.burntOrange, width: '33%' },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                Step 1 of 3
              </Text>
            </View>

            {/* Form */}
            <GlassCard variant="lg" padding="lg">
              <View style={styles.form}>
                <GlassInput
                  label="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Kwame"
                  autoCapitalize="words"
                  error={errors.firstName}
                  leftIcon="person"
                />

                <GlassInput
                  label="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Mensah"
                  autoCapitalize="words"
                  error={errors.lastName}
                  leftIcon="person-outline"
                />

                <GlassInput
                  label="Email (Optional)"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="kwame@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email}
                  leftIcon="mail"
                />

                <GlassInput
                  label="Phone Number"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="0241234567"
                  keyboardType="phone-pad"
                  error={errors.phone}
                  leftIcon="call"
                  helpText="We'll send you an OTP to verify"
                />

                <GlassButton
                  title="Continue"
                  onPress={handleRegister}
                  variant="primary"
                  size="lg"
                  loading={isLoading}
                  disabled={isLoading}
                  icon="arrow-forward"
                  iconPosition="right"
                />
              </View>
            </GlassCard>

            {/* Info Box */}
            <GlassCard variant="md" padding="md" style={styles.infoBox}>
              <View style={styles.infoContent}>
                <Ionicons
                  name="shield-checkmark"
                  size={24}
                  color={BookLoopColors.burntOrange}
                />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Your information is secure and will only be used to create your BookLoop account.
                  No passwords needed - we use OTP for secure authentication.
                </Text>
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },
  header: {
    marginBottom: Spacing.xl,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  titleContainer: {
    alignItems: 'center',
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
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: Spacing.xl,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
  },
  form: {
    gap: Spacing.lg,
  },
  infoBox: {
    marginTop: Spacing.xl,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
});
