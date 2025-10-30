/**
 * Login Screen
 *
 * Login for existing users with phone + password.
 *
 * Features:
 * - Phone number input
 * - Password input
 * - Remember me (optional)
 * - Forgot password link
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

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [errors, setErrors] = useState<{
    phone?: string;
    password?: string;
  }>({});

  /**
   * Validate Ghana phone number
   */
  const validatePhone = (phoneNumber: string): boolean => {
    const cleaned = phoneNumber.replace(/\s/g, '');
    return /^0[2-5][0-9]{8}$/.test(cleaned) || /^233[2-5][0-9]{8}$/.test(cleaned);
  };

  /**
   * Normalize phone to international format
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

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(phone)) {
      newErrors.phone = 'Invalid Ghana phone number';
    }

    if (!password) {
      newErrors.password = 'Password is required';
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
      await login(normalizedPhone, password);

      // Navigation handled by app routing based on auth state
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid phone or password');
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
                  Login to continue
                </Text>
              </View>
            </View>

            {/* Form */}
            <GlassCard variant="lg" padding="lg">
              <View style={styles.form}>
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
                  autoFocus
                />

                {/* Password */}
                <GlassInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  error={errors.password}
                  secureTextEntry
                  autoComplete="password"
                  leftIcon="lock-closed"
                />

                {/* Forgot Password Link */}
                <View style={styles.forgotContainer}>
                  <GlassButton
                    title="Forgot Password?"
                    onPress={() => router.push('/(auth)/forgot-password')}
                    variant="ghost"
                    size="sm"
                  />
                </View>

                {/* Login Button */}
                <GlassButton
                  title="Login"
                  onPress={handleLogin}
                  variant="primary"
                  size="lg"
                  loading={isLoading}
                  disabled={isLoading}
                  style={styles.loginButton}
                />

                {/* Register Link */}
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
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    justifyContent: 'center',
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
  },
  form: {
    gap: Spacing.md,
  },
  forgotContainer: {
    alignItems: 'flex-end',
    marginTop: -Spacing.xs,
  },
  loginButton: {
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
