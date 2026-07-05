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
  const params = useLocalSearchParams<{ phone?: string; email?: string; firstName?: string; isRegistration?: string }>();
  const { phone, email, firstName, isRegistration } = params;
  // The OTP was sent to whichever identifier was provided (phone for SMS, email otherwise).
  const identifier = phone ?? email ?? '';
  const { verifyOtp, isLoading } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [code, setCode] = useState('');
  const [resendTimer, setResendTimer] = useState(RESEND_TIMEOUT);
  const [isResending, setIsResending] = useState(false);

  const inputRef = useRef<TextInput>(null);

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
    if (code.length === OTP_LENGTH) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  /**
   * One input holds the whole code — keep only allowed characters, uppercase,
   * capped at length. This makes paste and SMS AutoFill drop the full code in
   * at once instead of one box at a time.
   */
  const handleCodeChange = (text: string) => {
    setCode(text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, OTP_LENGTH));
  };

  /**
   * Handle OTP verification
   */
  const handleVerify = async () => {
    if (code.length !== OTP_LENGTH) {
      showErrorToastMessage('Please enter all 6 characters', 'Invalid OTP');
      return;
    }

    try {
      console.log('[VerifyOTP] Verifying with:', identifier, 'code:', code);

      await verifyOtp(identifier, code);

      // Show success message
      showSuccessToastMessage(
        isRegistration === 'true'
          ? 'Account verified successfully! Welcome to BookLoop!'
          : 'Login successful! Welcome back!',
        'Verification Successful'
      );

      // Registration continues to Ghana Card verification (Step 3), then
      // profile setup. Login goes straight to the app.
      if (isRegistration === 'true') {
        router.replace('/(auth)/ghana-card');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      console.error('[VerifyOTP] Verification error:', error);
      showErrorToastMessage(error, 'Verification Failed');

      // Clear OTP and refocus
      setCode('');
      inputRef.current?.focus();
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
      await authService.resendOtp(identifier);
      setResendTimer(RESEND_TIMEOUT);
      showSuccessToastMessage(
        email ? 'A new code has been sent to your email' : 'A new code has been sent by SMS to your phone',
        'OTP Sent'
      );
    } catch (error: any) {
      showErrorToastMessage(error, 'Resend Failed');
    } finally {
      setIsResending(false);
    }
  };

  /**
   * Mask phone for display (show country code + last 3 digits).
   */
  const maskPhone = (value: string): string => {
    if (!value) return '';
    const last3 = value.slice(-3);
    const head = value.startsWith('+') ? value.slice(0, 4) : value.slice(0, 3);
    return `${head} ••• ${last3}`;
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
                name="chatbubble-ellipses"
                size={64}
                color={BookLoopColors.burntOrange}
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Enter the code
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {email ? 'Enter the 6-character code sent to' : 'Enter the 6-character code sent by SMS to'}
            </Text>
            <Text style={[styles.phone, { color: colors.text }]}>
              {email ? email : maskPhone(phone ?? '')}
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
            <View style={styles.otpWrap}>
              <View style={styles.otpContainer}>
                {Array.from({ length: OTP_LENGTH }).map((_, index) => {
                  const char = code[index] ?? '';
                  const isActive = index === code.length;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpInput,
                        {
                          backgroundColor: colors.surface,
                          borderColor: isActive
                            ? BookLoopColors.burntOrange
                            : char
                            ? BookLoopColors.success
                            : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.otpChar, { color: colors.text }]}>{char}</Text>
                    </View>
                  );
                })}
              </View>

              {/* One real input under the boxes — receives paste + SMS AutoFill */}
              <TextInput
                ref={inputRef}
                style={styles.hiddenInput}
                value={code}
                onChangeText={handleCodeChange}
                keyboardType="default"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                autoCapitalize="characters"
                maxLength={OTP_LENGTH}
                caretHidden
                autoFocus
                accessibilityLabel="Verification code"
              />
            </View>

            {/* Verify Button */}
            <GlassButton
              title="Verify"
              onPress={handleVerify}
              variant="primary"
              size="lg"
              loading={isLoading}
              disabled={isLoading || code.length !== OTP_LENGTH}
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
  otpWrap: {
    position: 'relative',
    marginBottom: Spacing.xl,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  otpInput: {
    width: 45,
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpChar: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    // keep it interactive/focusable across the whole box row
    color: 'transparent',
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
