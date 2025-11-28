/**
 * Login Screen
 *
 * Login for existing users with dual authentication.
 *
 * Features:
 * - Email-based authentication (primary)
 * - Password OR OTP login
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
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassButton, GlassInput, GlassCard } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { showErrorToastMessage, showSuccessToastMessage } from '@/utils/errorHandler';
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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usePasswordLogin, setUsePasswordLogin] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [touched, setTouched] = useState<{
    email?: boolean;
    password?: boolean;
  }>({});

  /**
   * Validate email format
   */
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Validate password
   */
  const validatePassword = (password: string): boolean => {
    if (!usePasswordLogin) return true; // Password not required for OTP login
    return password.length >= 8;
  };

  /**
   * Handle email change with live validation
   */
  const handleEmailChange = (value: string) => {
    setEmail(value);

    // Only validate if field has been touched
    if (touched.email) {
      if (!value.trim()) {
        setErrors(prev => ({ ...prev, email: 'Email is required' }));
      } else if (!validateEmail(value)) {
        setErrors(prev => ({ ...prev, email: 'Invalid email address' }));
      } else {
        setErrors(prev => ({ ...prev, email: undefined }));
      }
    }
  };

  /**
   * Handle password change with live validation
   */
  const handlePasswordChange = (value: string) => {
    setPassword(value);

    // Only validate if field has been touched
    if (touched.password && usePasswordLogin) {
      if (!value.trim()) {
        setErrors(prev => ({ ...prev, password: 'Password is required' }));
      } else if (!validatePassword(value)) {
        setErrors(prev => ({ ...prev, password: 'Password must be at least 8 characters' }));
      } else {
        setErrors(prev => ({ ...prev, password: undefined }));
      }
    }
  };

  /**
   * Handle field blur to mark as touched
   */
  const handleEmailBlur = () => {
    setTouched(prev => ({ ...prev, email: true }));

    // Validate on blur
    if (!email.trim()) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }));
    } else if (!validateEmail(email)) {
      setErrors(prev => ({ ...prev, email: 'Invalid email address' }));
    } else {
      setErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  /**
   * Handle password blur to mark as touched
   */
  const handlePasswordBlur = () => {
    setTouched(prev => ({ ...prev, password: true }));

    // Validate on blur
    if (usePasswordLogin) {
      if (!password.trim()) {
        setErrors(prev => ({ ...prev, password: 'Password is required' }));
      } else if (!validatePassword(password)) {
        setErrors(prev => ({ ...prev, password: 'Password must be at least 8 characters' }));
      } else {
        setErrors(prev => ({ ...prev, password: undefined }));
      }
    }
  };

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Invalid email address';
    }

    if (usePasswordLogin) {
      if (!password.trim()) {
        newErrors.password = 'Password is required';
      } else if (!validatePassword(password)) {
        newErrors.password = 'Password must be at least 8 characters';
      }
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
      const response = await login(
        email.trim(),
        usePasswordLogin && password.trim() ? password.trim() : undefined,
      );

      // If OTP was sent (not password login), navigate to OTP verification
      if (response.message) {
        showSuccessToastMessage(
          'OTP sent to your email. Please check your inbox.',
          'Login'
        );

        router.push({
          pathname: '/(auth)/verify-otp',
          params: {
            email: email.trim(),
            isRegistration: 'false',
          },
        });
      } else {
        // Password login successful
        showSuccessToastMessage(
          'Welcome back!',
          'Login Successful'
        );
      }
    } catch (error: any) {
      showErrorToastMessage(error, 'Login Failed');
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
                onPress={() => router.push('/(auth)/welcome')}
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
                  label="Email Address"
                  value={email}
                  onChangeText={handleEmailChange}
                  onBlur={handleEmailBlur}
                  placeholder="kwame@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email}
                  leftIcon="mail"
                />

                {/* Password Toggle */}
                <TouchableOpacity
                  onPress={() => setUsePasswordLogin(!usePasswordLogin)}
                  style={styles.passwordToggle}
                >
                  <Ionicons
                    name={usePasswordLogin ? "checkbox" : "square-outline"}
                    size={24}
                    color={BookLoopColors.burntOrange}
                  />
                  <Text style={[styles.passwordToggleText, { color: colors.text }]}>
                    Login with password
                  </Text>
                </TouchableOpacity>

                {usePasswordLogin && (
                  <GlassInput
                    label="Password"
                    value={password}
                    onChangeText={handlePasswordChange}
                    onBlur={handlePasswordBlur}
                    placeholder="Enter your password"
                    secureTextEntry={!showPassword}
                    error={errors.password}
                    leftIcon="lock-closed"
                    rightIcon={showPassword ? "eye-off" : "eye"}
                    onRightIconPress={() => setShowPassword(!showPassword)}
                  />
                )}

                <GlassButton
                  title={usePasswordLogin ? "Login" : "Send OTP"}
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
                  {usePasswordLogin
                    ? "Login with your password for quick access, or use OTP for enhanced security."
                    : "We'll send a 6-digit code to your email for secure authentication."}
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
  passwordToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  passwordToggleText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.body,
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
