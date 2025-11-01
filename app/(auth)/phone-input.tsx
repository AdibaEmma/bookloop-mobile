/**
 * Registration Screen
 *
 * Step 1: User registration - collect email, phone, names, and optional password.
 *
 * Features:
 * - Email-based authentication (primary)
 * - Ghana phone number validation
 * - Name inputs (first, last)
 * - Optional password for dual auth (password or OTP login)
 * - Form validation
 * - Send OTP to email for verification
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

export default function PhoneInputScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Validate password
   */
  const validatePassword = (password: string): boolean => {
    if (!showPasswordField || !password) return true; // Password is optional
    return password.length >= 8;
  };

  /**
   * Live validation for first name
   */
  const validateFirstNameLive = (value: string) => {
    setFirstName(value);
    const newErrors = { ...errors };

    if (!value.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (value.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    } else {
      delete newErrors.firstName;
    }

    setErrors(newErrors);
  };

  /**
   * Live validation for last name
   */
  const validateLastNameLive = (value: string) => {
    setLastName(value);
    const newErrors = { ...errors };

    if (!value.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (value.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    } else {
      delete newErrors.lastName;
    }

    setErrors(newErrors);
  };

  /**
   * Live validation for email
   */
  const validateEmailLive = (value: string) => {
    setEmail(value);
    const newErrors = { ...errors };

    if (!value.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(value)) {
      newErrors.email = 'Invalid email address';
    } else {
      delete newErrors.email;
    }

    setErrors(newErrors);
  };

  /**
   * Live validation for phone
   */
  const validatePhoneLive = (value: string) => {
    setPhone(value);
    const newErrors = { ...errors };

    if (!value.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(value)) {
      newErrors.phone = 'Invalid Ghana phone number (e.g., 0241234567)';
    } else {
      delete newErrors.phone;
    }

    setErrors(newErrors);
  };

  /**
   * Live validation for password
   */
  const validatePasswordLive = (value: string) => {
    setPassword(value);
    const newErrors = { ...errors };

    if (showPasswordField && value.trim()) {
      if (value.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      } else {
        delete newErrors.password;
      }

      // Also validate confirm password if it has a value
      if (confirmPassword) {
        if (value !== confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        } else {
          delete newErrors.confirmPassword;
        }
      }
    } else {
      delete newErrors.password;
    }

    setErrors(newErrors);
  };

  /**
   * Live validation for confirm password
   */
  const validateConfirmPasswordLive = (value: string) => {
    setConfirmPassword(value);
    const newErrors = { ...errors };

    if (showPasswordField && value.trim()) {
      if (value !== password) {
        newErrors.confirmPassword = 'Passwords do not match';
      } else {
        delete newErrors.confirmPassword;
      }
    } else {
      delete newErrors.confirmPassword;
    }

    setErrors(newErrors);
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

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(phone)) {
      newErrors.phone = 'Invalid Ghana phone number (e.g., 0241234567)';
    }

    if (showPasswordField && password.trim()) {
      if (!validatePassword(password)) {
        newErrors.password = 'Password must be at least 8 characters';
      }

      if (!confirmPassword.trim()) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
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
        email.trim(),
        normalizedPhone,
        firstName.trim(),
        lastName.trim(),
        showPasswordField && password.trim() ? password.trim() : undefined,
      );

      // Show success toast
      showSuccessToastMessage(
        'OTP sent to your email. Please check your inbox.',
        'Registration Successful'
      );

      // Navigate to OTP verification
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          email: email.trim(),
          firstName: firstName.trim(),
          isRegistration: 'true',
        },
      });
    } catch (error: any) {
      showErrorToastMessage(error, 'Registration Failed');
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
                  onChangeText={validateFirstNameLive}
                  placeholder="Kwame"
                  autoCapitalize="words"
                  error={errors.firstName}
                  icon={
                    <Ionicons
                      name="person"
                      size={20}
                      color={colors.textSecondary}
                    />
                  }
                />

                <GlassInput
                  label="Last Name"
                  value={lastName}
                  onChangeText={validateLastNameLive}
                  placeholder="Mensah"
                  autoCapitalize="words"
                  error={errors.lastName}
                  icon={
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={colors.textSecondary}
                    />
                  }
                />

                <GlassInput
                  label="Email Address"
                  value={email}
                  onChangeText={validateEmailLive}
                  placeholder="kwame@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email}
                  icon={
                    <Ionicons
                      name="mail"
                      size={20}
                      color={colors.textSecondary}
                    />
                  }
                />

                <GlassInput
                  label="Phone Number"
                  value={phone}
                  onChangeText={validatePhoneLive}
                  placeholder="0241234567"
                  keyboardType="phone-pad"
                  error={errors.phone}
                  icon={
                    <Ionicons
                      name="call"
                      size={20}
                      color={colors.textSecondary}
                    />
                  }
                />

                {/* Password Toggle */}
                <TouchableOpacity
                  onPress={() => setShowPasswordField(!showPasswordField)}
                  style={styles.passwordToggle}
                >
                  <Ionicons
                    name={showPasswordField ? "checkbox" : "square-outline"}
                    size={24}
                    color={BookLoopColors.burntOrange}
                  />
                  <Text style={[styles.passwordToggleText, { color: colors.text }]}>
                    Set a password (optional - allows password login)
                  </Text>
                </TouchableOpacity>

                {showPasswordField && (
                  <>
                    <GlassInput
                      label="Password"
                      value={password}
                      onChangeText={validatePasswordLive}
                      placeholder="Min. 8 characters"
                      secureTextEntry={!showPassword}
                      error={errors.password}
                      icon={
                        <Ionicons
                          name="lock-closed"
                          size={20}
                          color={colors.textSecondary}
                        />
                      }
                      rightIcon={
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                          <Ionicons
                            name={showPassword ? "eye-off" : "eye"}
                            size={24}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                      }
                    />

                    <GlassInput
                      label="Confirm Password"
                      value={confirmPassword}
                      onChangeText={validateConfirmPasswordLive}
                      placeholder="Re-enter password"
                      secureTextEntry={!showConfirmPassword}
                      error={errors.confirmPassword}
                      icon={
                        <Ionicons
                          name="lock-closed-outline"
                          size={20}
                          color={colors.textSecondary}
                        />
                      }
                      rightIcon={
                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                          <Ionicons
                            name={showConfirmPassword ? "eye-off" : "eye"}
                            size={24}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                      }
                    />
                  </>
                )}

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
                  Your information is secure. Choose to set a password for quick login, or use OTP-only authentication for enhanced security.
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
});
