/**
 * Phone Input Screen
 *
 * User registration - phone number and basic info input.
 *
 * Features:
 * - Ghana phone number validation
 * - Name inputs
 * - Password creation
 * - Form validation
 * - Send OTP
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassButton, GlassInput, GlassCard } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  /**
   * Validate Ghana phone number
   * Format: 0XXXXXXXXX (10 digits) or 233XXXXXXXXX (12 digits)
   */
  const validatePhone = (phoneNumber: string): boolean => {
    const cleaned = phoneNumber.replace(/\s/g, '');

    // Ghana format: starts with 0 and 10 digits total
    if (/^0[2-5][0-9]{8}$/.test(cleaned)) {
      return true;
    }

    // International format: starts with 233 and 12 digits total
    if (/^233[2-5][0-9]{8}$/.test(cleaned)) {
      return true;
    }

    return false;
  };

  /**
   * Normalize phone to international format (233XXXXXXXXX)
   */
  const normalizePhone = (phoneNumber: string): string => {
    const cleaned = phoneNumber.replace(/\s/g, '');

    if (cleaned.startsWith('0')) {
      return '233' + cleaned.substring(1);
    }

    return cleaned;
  };

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(phone)) {
      newErrors.phone = 'Invalid Ghana phone number (e.g., 0241234567)';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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

      await register(normalizedPhone, firstName.trim(), lastName.trim(), password);

      // Navigate to OTP verification
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phone: normalizedPhone },
      });
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Please try again');
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
                  size={32}
                  color={BookLoopColors.burntOrange}
                />
                <Text style={[styles.title, { color: colors.text }]}>
                  Create Account
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Join the BookLoop community
                </Text>
              </View>
            </View>

            {/* Form */}
            <GlassCard variant="lg" padding="lg">
              <View style={styles.form}>
                {/* First Name */}
                <GlassInput
                  label="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Enter your first name"
                  error={errors.firstName}
                  autoCapitalize="words"
                  autoComplete="name-given"
                />

                {/* Last Name */}
                <GlassInput
                  label="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Enter your last name"
                  error={errors.lastName}
                  autoCapitalize="words"
                  autoComplete="name-family"
                />

                {/* Phone Number */}
                <GlassInput
                  label="Phone Number"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="0241234567"
                  error={errors.phone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  leftIcon="call"
                />

                {/* Password */}
                <GlassInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create a password"
                  error={errors.password}
                  secureTextEntry
                  autoComplete="password-new"
                  leftIcon="lock-closed"
                />

                {/* Confirm Password */}
                <GlassInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
                  error={errors.confirmPassword}
                  secureTextEntry
                  autoComplete="password-new"
                  leftIcon="lock-closed"
                />

                {/* Submit Button */}
                <GlassButton
                  title="Continue"
                  onPress={handleRegister}
                  variant="primary"
                  size="lg"
                  loading={isLoading}
                  disabled={isLoading}
                  style={styles.submitButton}
                />

                {/* Login Link */}
                <View style={styles.footer}>
                  <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                    Already have an account?{' '}
                  </Text>
                  <GlassButton
                    title="Login"
                    onPress={() => router.push('/(auth)/login')}
                    variant="ghost"
                    size="sm"
                  />
                </View>
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
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.body,
  },
  form: {
    gap: Spacing.md,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  footerText: {
    fontSize: Typography.fontSize.sm,
  },
});
