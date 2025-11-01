/**
 * OTP Verification Screen
 *
 * Verify email with OTP code.
 *
 * Features:
 * - 6-character alphanumeric OTP input
 * - Auto-focus next input
 * - Resend OTP
 * - Countdown timer
 * - Auto-submit when complete
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassButton, GlassCard } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePreventBack } from '@/hooks/usePreventBack';
import { showErrorToastMessage, showSuccessToastMessage } from '@/utils/errorHandler';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  BookLoopColors,
} from '@/constants/theme';

const OTP_LENGTH = 6;
const RESEND_TIMEOUT = 60; // seconds

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string; firstName?: string; isRegistration?: string }>();
  const { email, firstName, isRegistration } = params;
  const { verifyOtp, isLoading } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [activeIndex, setActiveIndex] = useState(0);
  const [resendTimer, setResendTimer] = useState(RESEND_TIMEOUT);
  const [isResending, setIsResending] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Prevent going back after reaching OTP screen
  usePreventBack();

  /**
   * Countdown timer for resend
   */
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  /**
   * Auto-submit when OTP is complete
   */
  useEffect(() => {
    if (otp.every((digit) => digit !== '')) {
      handleVerify();
    }
  }, [otp]);

  /**
   * Handle OTP input change
   */
  const handleChange = (text: string, index: number) => {
    // Allow alphanumeric characters (A-Z, 0-9)
    const char = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    if (char.length > 1) {
      // Handle paste
      const chars = char.slice(0, OTP_LENGTH).split('');
      const newOtp = [...otp];
      chars.forEach((c, i) => {
        if (index + i < OTP_LENGTH) {
          newOtp[index + i] = c;
        }
      });
      setOtp(newOtp);

      // Focus last filled input or next empty
      const nextIndex = Math.min(index + chars.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      setActiveIndex(nextIndex);
    } else {
      // Single character input
      const newOtp = [...otp];
      newOtp[index] = char;
      setOtp(newOtp);

      // Auto-focus next input
      if (char && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
        setActiveIndex(index + 1);
      }
    }
  };

  /**
   * Handle backspace
   */
  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setActiveIndex(index - 1);
    }
  };

  /**
   * Handle OTP verification
   */
  const handleVerify = async () => {
    const code = otp.join('');

    if (code.length !== OTP_LENGTH) {
      showErrorToastMessage('Please enter all 6 characters', 'Invalid OTP');
      return;
    }

    try {
      console.log('[VerifyOTP] Verifying with email:', email, 'code:', code);

      await verifyOtp(email, code);

      // Show success message
      showSuccessToastMessage(
        isRegistration === 'true'
          ? 'Account verified successfully! Welcome to BookLoop!'
          : 'Login successful! Welcome back!',
        'Verification Successful'
      );

      // Navigate to profile setup if registration, otherwise to main app
      if (isRegistration === 'true') {
        router.replace('/(auth)/profile-setup');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      console.error('[VerifyOTP] Verification error:', error);
      showErrorToastMessage(error, 'Verification Failed');

      // Clear OTP and focus first input
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      setActiveIndex(0);
    }
  };

  /**
   * Resend OTP
   */
  const handleResend = async () => {
    if (resendTimer > 0 || isResending) {
      return;
    }

    try {
      setIsResending(true);
      await authService.resendOtp(email);
      setResendTimer(RESEND_TIMEOUT);
      showSuccessToastMessage(
        'A new code has been sent to your email',
        'OTP Sent'
      );
    } catch (error: any) {
      showErrorToastMessage(error, 'Resend Failed');
    } finally {
      setIsResending(false);
    }
  };

  /**
   * Mask email for display (show first 3 chars and domain)
   */
  const maskEmail = (email: string): string => {
    const [localPart, domain] = email.split('@');
    if (!domain) return email;
    const maskedLocal = localPart.substring(0, 3) + '***';
    return `${maskedLocal}@${domain}`;
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
        {/* Content - Centered */}
        <View style={styles.content}>
          {/* Back Button - Absolute positioned */}
          <View style={styles.backButtonContainer}>
            <GlassButton
              title=""
              icon="arrow-back"
              onPress={() => router.back()}
              variant="ghost"
              size="md"
            />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="mail"
                size={64}
                color={BookLoopColors.burntOrange}
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Verify Email
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter the 6-character code sent to
            </Text>
            <Text style={[styles.phone, { color: colors.text }]}>
              {maskEmail(email)}
            </Text>
          </View>

          {/* Progress Indicator */}
          {isRegistration === 'true' && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: BookLoopColors.burntOrange, width: '66%' },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                Step 2 of 3
              </Text>
            </View>
          )}

          {/* OTP Input */}
          <GlassCard variant="lg" padding="xl">
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.otpInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor:
                        activeIndex === index
                          ? BookLoopColors.burntOrange
                          : digit
                          ? BookLoopColors.success
                          : colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={digit}
                  onChangeText={(text) => handleChange(text, index)}
                  onKeyPress={({ nativeEvent: { key } }) =>
                    handleKeyPress(key, index)
                  }
                  onFocus={() => setActiveIndex(index)}
                  keyboardType="default"
                  autoCapitalize="characters"
                  maxLength={1}
                  selectTextOnFocus
                  autoFocus={index === 0}
                />
              ))}
            </View>

            {/* Verify Button */}
            <GlassButton
              title="Verify"
              onPress={handleVerify}
              variant="primary"
              size="lg"
              loading={isLoading}
              disabled={isLoading || otp.some((digit) => !digit)}
              style={styles.verifyButton}
            />

            {/* Resend Link */}
            <View style={styles.resendContainer}>
              {resendTimer > 0 ? (
                <Text style={[styles.resendText, { color: colors.textSecondary }]}>
                  Resend code in {resendTimer}s
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} disabled={isResending}>
                  <Text
                    style={[
                      styles.resendLink,
                      {
                        color: isResending
                          ? colors.textSecondary
                          : BookLoopColors.burntOrange,
                      },
                    ]}
                  >
                    {isResending ? 'Sending...' : 'Resend Code'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </GlassCard>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  backButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    zIndex: 10,
  },
  header: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.body,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  phone: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  otpInput: {
    width: 45,
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
  },
  verifyButton: {
    marginBottom: Spacing.md,
  },
  resendContainer: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: Typography.fontSize.sm,
  },
  resendLink: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});
