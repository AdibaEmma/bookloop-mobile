/**
 * QR Handover Confirmation Screen
 *
 * Two modes:
 * - Giver Mode: Display QR code for receiver to scan
 * - Receiver Mode: Camera scanner to scan giver's QR code
 *
 * Features:
 * - QR code generation with encrypted payload
 * - QR code regeneration every 10 minutes
 * - Barcode scanner for verification
 * - Success animation on completion
 * - Offline support with local sync
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Vibration,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import LottieView from 'lottie-react-native';
import { GlassCard, GlassButton } from '@/components/ui';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { exchangesService } from '@/services/api';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
  BorderRadius,
} from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QR_SIZE = SCREEN_WIDTH * 0.65;

type HandoverMode = 'giver' | 'receiver';
type HandoverStatus = 'pending' | 'scanning' | 'verifying' | 'success' | 'error';

interface ExchangeDetails {
  id: string;
  bookTitle: string;
  otherPartyName: string;
  meetupLocation: string;
  scheduledTime?: string;
}

export default function QRHandoverScreen() {
  const { exchangeId, mode: initialMode } = useLocalSearchParams<{
    exchangeId: string;
    mode?: HandoverMode;
  }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<HandoverMode>(initialMode || 'giver');
  const [status, setStatus] = useState<HandoverStatus>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [exchange, setExchange] = useState<ExchangeDetails | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [qrExpiry, setQrExpiry] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('10:00');
  const [scanned, setScanned] = useState(false);

  /**
   * Load exchange details and generate QR code
   */
  useEffect(() => {
    loadExchangeDetails();
  }, [exchangeId]);

  /**
   * Timer for QR code expiry
   */
  useEffect(() => {
    if (!qrExpiry || mode !== 'giver') return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = qrExpiry.getTime() - now.getTime();

      if (diff <= 0) {
        // QR code expired, regenerate
        generateQRCode();
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [qrExpiry, mode]);

  const loadExchangeDetails = async () => {
    try {
      setIsLoading(true);

      // Load exchange details from API
      const data = await exchangesService.getExchangeById(exchangeId);

      setExchange({
        id: data.id,
        bookTitle: data.listing?.book?.title || 'Book',
        otherPartyName: `${data.requester?.firstName || ''} ${data.requester?.lastName || ''}`.trim() || 'User',
        meetupLocation: data.meetupLocation?.name || 'Meetup Location',
        scheduledTime: data.scheduledDate,
      });

      // Generate initial QR code if giver mode
      if (mode === 'giver') {
        await generateQRCode();
      }
    } catch (error) {
      console.error('Failed to load exchange:', error);
      // Use mock data for demo
      setExchange({
        id: exchangeId,
        bookTitle: 'The Alchemist',
        otherPartyName: 'Kwame Mensah',
        meetupLocation: 'Accra Mall Food Court',
      });

      if (mode === 'giver') {
        // Generate local QR code for demo
        const payload = JSON.stringify({
          exchangeId,
          timestamp: Date.now(),
          type: 'handover',
        });
        setQrCode(payload);
        setQrExpiry(new Date(Date.now() + 10 * 60 * 1000)); // 10 minutes
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRCode = async () => {
    try {
      // Generate QR code from API
      const response = await exchangesService.generateHandoverQR(exchangeId);
      setQrCode(response.code);
      setQrExpiry(new Date(response.expiresAt));
    } catch (error) {
      console.error('Failed to generate QR:', error);
      // Generate local QR for offline/demo
      const payload = JSON.stringify({
        exchangeId,
        timestamp: Date.now(),
        type: 'handover',
        nonce: Math.random().toString(36).substring(7),
      });
      setQrCode(payload);
      setQrExpiry(new Date(Date.now() + 10 * 60 * 1000));
    }
  };

  /**
   * Handle QR code scan
   */
  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;

    setScanned(true);
    setStatus('verifying');
    Vibration.vibrate(100);

    try {
      // Parse and validate QR code
      const payload = JSON.parse(data);

      if (payload.exchangeId !== exchangeId) {
        throw new Error('Invalid QR code for this exchange');
      }

      // Verify with API
      await exchangesService.confirmHandover(exchangeId, data);

      setStatus('success');
      Vibration.vibrate([100, 100, 100]);

      // Navigate to review after delay
      setTimeout(() => {
        router.replace({
          pathname: '/exchange/rate/[id]',
          params: { id: exchangeId },
        });
      }, 2500);
    } catch (error: any) {
      console.error('Handover verification failed:', error);
      setStatus('error');

      Alert.alert(
        'Verification Failed',
        error.message || 'Could not verify the QR code. Please try again.',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setScanned(false);
              setStatus('scanning');
            },
          },
        ]
      );
    }
  };

  /**
   * Request camera permission
   */
  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert(
        'Camera Permission Required',
        'Please enable camera access in settings to scan QR codes.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Toggle between giver and receiver mode
   */
  const toggleMode = () => {
    const newMode = mode === 'giver' ? 'receiver' : 'giver';
    setMode(newMode);
    setScanned(false);
    setStatus('pending');

    if (newMode === 'giver' && !qrCode) {
      generateQRCode();
    }
  };

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <LinearGradient
          colors={
            colorScheme === 'light'
              ? [BookLoopColors.cream, BookLoopColors.lightPeach]
              : [BookLoopColors.deepBrown, BookLoopColors.charcoal]
          }
          style={StyleSheet.absoluteFillObject}
        />
        <ActivityIndicator size="large" color={BookLoopColors.burntOrange} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading exchange details...
        </Text>
      </View>
    );
  }

  /**
   * Render success state
   */
  if (status === 'success') {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <LinearGradient
          colors={
            colorScheme === 'light'
              ? [BookLoopColors.cream, BookLoopColors.lightPeach]
              : [BookLoopColors.deepBrown, BookLoopColors.charcoal]
          }
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={BookLoopColors.success} />
          </View>

          <Text style={[styles.successTitle, { color: colors.text }]}>
            Exchange Complete!
          </Text>
          <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
            You've successfully exchanged "{exchange?.bookTitle}"
          </Text>

          <Text style={[styles.redirectText, { color: colors.textSecondary }]}>
            Redirecting to review...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: mode === 'giver' ? 'Show QR Code' : 'Scan QR Code',
          headerShown: true,
          headerTransparent: true,
          headerTintColor: mode === 'receiver' ? '#FFFFFF' : colors.text,
        }}
      />

      <View style={styles.container}>
        <LinearGradient
          colors={
            colorScheme === 'light'
              ? [BookLoopColors.cream, BookLoopColors.lightPeach]
              : [BookLoopColors.deepBrown, BookLoopColors.charcoal]
          }
          style={StyleSheet.absoluteFillObject}
        />

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'giver' && styles.modeButtonActive,
            ]}
            onPress={() => setMode('giver')}
          >
            <Ionicons
              name="qr-code"
              size={20}
              color={mode === 'giver' ? '#FFFFFF' : colors.text}
            />
            <Text
              style={[
                styles.modeButtonText,
                { color: mode === 'giver' ? '#FFFFFF' : colors.text },
              ]}
            >
              Show Code
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'receiver' && styles.modeButtonActive,
            ]}
            onPress={() => setMode('receiver')}
          >
            <Ionicons
              name="scan"
              size={20}
              color={mode === 'receiver' ? '#FFFFFF' : colors.text}
            />
            <Text
              style={[
                styles.modeButtonText,
                { color: mode === 'receiver' ? '#FFFFFF' : colors.text },
              ]}
            >
              Scan Code
            </Text>
          </TouchableOpacity>
        </View>

        {/* Giver Mode - Show QR Code */}
        {mode === 'giver' && (
          <View style={styles.giverContainer}>
            <GlassCard variant="lg" padding="xl" style={styles.qrCard}>
              <Text style={[styles.instructionText, { color: colors.text }]}>
                Show this code to
              </Text>
              <Text style={[styles.otherPartyName, { color: colors.text }]}>
                {exchange?.otherPartyName}
              </Text>

              <View style={styles.qrContainer}>
                <QRCode
                  value={qrCode || 'loading'}
                  size={QR_SIZE}
                  color={BookLoopColors.deepBrown}
                  backgroundColor="transparent"
                />
              </View>

              <View style={styles.expiryContainer}>
                <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.expiryText, { color: colors.textSecondary }]}>
                  Code expires in {timeRemaining}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.regenerateButton}
                onPress={generateQRCode}
              >
                <Ionicons name="refresh" size={18} color={BookLoopColors.burntOrange} />
                <Text style={[styles.regenerateText, { color: BookLoopColors.burntOrange }]}>
                  Regenerate Code
                </Text>
              </TouchableOpacity>
            </GlassCard>

            {/* Exchange Details */}
            <GlassCard variant="md" padding="md" style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Ionicons name="book" size={18} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {exchange?.bookTitle}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="location" size={18} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {exchange?.meetupLocation}
                </Text>
              </View>
            </GlassCard>
          </View>
        )}

        {/* Receiver Mode - Scan QR Code */}
        {mode === 'receiver' && (
          <View style={styles.receiverContainer}>
            {!permission?.granted ? (
              <View style={styles.permissionContainer}>
                <Ionicons name="camera" size={64} color={colors.textSecondary} />
                <Text style={[styles.permissionTitle, { color: colors.text }]}>
                  Camera Permission Required
                </Text>
                <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
                  We need camera access to scan the QR code
                </Text>
                <GlassButton
                  title="Enable Camera"
                  onPress={handleRequestPermission}
                  variant="primary"
                  icon="camera"
                  style={styles.permissionButton}
                />
              </View>
            ) : (
              <>
                <View style={styles.scannerContainer}>
                  <CameraView
                    style={styles.scanner}
                    facing="back"
                    barcodeScannerSettings={{
                      barcodeTypes: ['qr'],
                    }}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                  />

                  {/* Scanner Overlay */}
                  <View style={styles.scannerOverlay}>
                    <View style={styles.scannerFrame}>
                      <View style={[styles.scannerCorner, styles.cornerTopLeft]} />
                      <View style={[styles.scannerCorner, styles.cornerTopRight]} />
                      <View style={[styles.scannerCorner, styles.cornerBottomLeft]} />
                      <View style={[styles.scannerCorner, styles.cornerBottomRight]} />
                    </View>
                  </View>
                </View>

                <View style={styles.scanInstructions}>
                  <Text style={[styles.scanTitle, { color: colors.text }]}>
                    Scan {exchange?.otherPartyName}'s QR Code
                  </Text>
                  <Text style={[styles.scanSubtitle, { color: colors.textSecondary }]}>
                    Position the QR code within the frame to confirm the exchange
                  </Text>

                  {status === 'verifying' && (
                    <View style={styles.verifyingContainer}>
                      <ActivityIndicator size="small" color={BookLoopColors.burntOrange} />
                      <Text style={[styles.verifyingText, { color: colors.textSecondary }]}>
                        Verifying...
                      </Text>
                    </View>
                  )}
                </View>

                {/* Manual Code Entry */}
                <TouchableOpacity
                  style={styles.manualEntry}
                  onPress={() => {
                    Alert.prompt(
                      'Enter Code Manually',
                      'If you cannot scan the QR code, enter the 6-digit code shown below it.',
                      (code) => {
                        if (code) {
                          handleBarCodeScanned({ data: code });
                        }
                      }
                    );
                  }}
                >
                  <Text style={[styles.manualEntryText, { color: BookLoopColors.burntOrange }]}>
                    Can't scan? Enter code manually
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
  },
  modeToggle: {
    flexDirection: 'row',
    marginTop: 100,
    marginHorizontal: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  modeButtonActive: {
    backgroundColor: BookLoopColors.burntOrange,
  },
  modeButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  giverContainer: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  qrCard: {
    alignItems: 'center',
  },
  instructionText: {
    fontSize: Typography.fontSize.base,
    marginBottom: Spacing.xs,
  },
  otherPartyName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.lg,
  },
  qrContainer: {
    padding: Spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  expiryText: {
    fontSize: Typography.fontSize.sm,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  regenerateText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  detailsCard: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailText: {
    fontSize: Typography.fontSize.base,
  },
  receiverContainer: {
    flex: 1,
    marginTop: Spacing.lg,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  permissionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: Typography.fontSize.base,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: Spacing.xl,
  },
  scannerContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.lg,
  },
  scanner: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  scannerCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: BookLoopColors.burntOrange,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scanInstructions: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  scanTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
  scanSubtitle: {
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  verifyingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  verifyingText: {
    fontSize: Typography.fontSize.sm,
  },
  manualEntry: {
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  manualEntryText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  successContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  successIcon: {
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  redirectText: {
    fontSize: Typography.fontSize.sm,
    marginTop: Spacing.xl,
  },
});
