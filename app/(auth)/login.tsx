/**
 * Login Screen
 *
 * Login for existing users with OTP verification.
 *
 * Features:
 * - Phone number input
 * - OTP-based authentication (passwordless)
 * - Form validation
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

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{
    phone?: string;
  }>({});

  /**
   * Validate Ghana phone number
   */
  const validatePhone = (phoneNumber: string): boolean => {
    const cleaned = phoneNumber.replace(/\s+/g, '');
    return /^0\d{9}$/.test(cleaned) || /^233\d{9}$/.test(cleaned);
  };

  /**
   * Normalize phone to international format
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
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(phone)) {
      newErrors.phone = 'Invalid Ghana phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle login
   */
  const handleLogin = async () => {
    if (!validate()) {
      return;
    }

    try {
      const normalizedPhone = normalizePhone(phone);
      await login(normalizedPhone);

      // Navigate to OTP verification
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          phone: normalizedPhone,
          isRegistration: 'false',
        },
      });
    } catch (error: any) {
      showError(error, 'Login Failed');
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
                  name="log-in"
                  size={48}
                  color={BookLoopColors.burntOrange}
                />
                <Text style={[styles.title, { color: colors.text }]}>
                  Welcome Back
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Log in to continue exchanging books
                </Text>
              </View>
            </View>

            {/* Form */}
            <GlassCard variant="lg" padding="lg">
              <View style={styles.form}>
                <GlassInput
                  label="Phone Number"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="0241234567"
                  keyboardType="phone-pad"
                  error={errors.phone}
                  helpText="We'll send you an OTP to verify"
                />

                <GlassButton
                  title="Send OTP"
                  onPress={handleLogin}
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
                  We use OTP for secure, passwordless authentication.
                  You'll receive a 6-digit code via SMS.
                </Text>
              </View>
            </GlassCard>

            {/* Sign Up Link */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                Don't have an account?{' '}
              </Text>
              <GlassButton
                title="Sign Up"
                onPress={() => router.push('/(auth)/phone-input')}
                variant="ghost"
                size="sm"
              />
            </View>
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    fontSize: Typography.fontSize.base,
  },
});
