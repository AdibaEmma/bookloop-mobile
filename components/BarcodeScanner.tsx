/**
 * Barcode Scanner Component
 *
 * ISBN barcode scanner using expo-camera
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';
import { showErrorAlert, showWarningAlert } from '@/components/ui/AlertManager';

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (isbn: string) => void;
}

export function BarcodeScanner({ visible, onClose, onScan }: BarcodeScannerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
    // Reset scanned state when modal opens
    if (visible) {
      setScanned(false);
      setProcessingMessage(null);
    }
  }, [visible]);

  const handleBarCodeScanned = ({ type, data }: BarcodeScanningResult) => {
    if (scanned) return;

    setScanned(true);
    setProcessingMessage('Reading barcode...');

    console.log('Barcode scanned - Type:', type, 'Data:', data);

    // Clean the scanned data (remove dashes, spaces, and any non-numeric characters)
    const cleanedData = data.replace(/[^0-9]/g, '');

    console.log('Cleaned barcode data:', cleanedData);

    // Validate ISBN length (10 or 13 digits)
    // Most book ISBNs are 13 digits (EAN-13), some older ones are 10 digits
    if (cleanedData.length === 10 || cleanedData.length === 13) {
      console.log('Valid ISBN detected:', cleanedData);
      setProcessingMessage(`Searching for ISBN: ${cleanedData}...`);
      onScan(cleanedData);
      // Don't close immediately - let the parent handle it after search
    } else if (cleanedData.length > 0) {
      // If we got some digits but not the right length, show error
      setProcessingMessage(null);
      showErrorAlert(
        `Scanned barcode has ${cleanedData.length} digits. ISBNs should have 10 or 13 digits. Please try again.`,
        'Invalid ISBN Length'
      );
      console.log('Invalid ISBN length:', cleanedData.length);
      setTimeout(() => {
        setScanned(false);
        setProcessingMessage(null);
      }, 2000);
    } else {
      // No valid data extracted
      setProcessingMessage(null);
      showWarningAlert(
        'Could not read barcode. Please ensure the ISBN barcode is clear and well-lit.',
        'Scan Failed'
      );
      console.log('No valid data extracted from barcode');
      setTimeout(() => {
        setScanned(false);
        setProcessingMessage(null);
      }, 2000);
    }
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <BlurView intensity={80} style={styles.container}>
          <View style={[styles.permissionContainer, { backgroundColor: colors.background }]}>
            <Ionicons name="camera-outline" size={64} color={BookLoopColors.burntOrange} />
            <Text style={[styles.permissionTitle, { color: colors.text }]}>
              Camera Permission Required
            </Text>
            <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
              We need access to your camera to scan ISBN barcodes
            </Text>
            <TouchableOpacity
              onPress={requestPermission}
              style={[styles.permissionButton, { backgroundColor: BookLoopColors.burntOrange }]}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: [
              'ean13',      // Most common for ISBNs (13-digit)
              'ean8',       // 8-digit barcodes
              'upc_a',      // UPC-A (can be used for ISBNs)
              'upc_e',      // UPC-E
              'code128',    // Alternative ISBN encoding
              'code39',     // Sometimes used for ISBNs
              'codabar',    // Library barcodes
              'itf14',      // 14-digit ITF
            ],
          }}
        />

        {/* Overlay with absolute positioning */}
        <View style={styles.overlay} pointerEvents="box-none">
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Center scanning area */}
          <View style={styles.centerContainer}>
            <View style={styles.scanningBox}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          {/* Instructions or Processing Message */}
          <View style={styles.instructions}>
            {processingMessage ? (
              <>
                <View style={styles.processingContainer}>
                  <View style={styles.processingIndicator} />
                  <Text style={styles.processingText}>{processingMessage}</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.instructionText}>
                  Position the ISBN barcode within the frame
                </Text>
                <Text style={styles.instructionSubtext}>
                  Usually found on the back cover
                </Text>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: Spacing.lg,
    paddingTop: Spacing['3xl'],
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningBox: {
    width: 250,
    height: 150,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: BookLoopColors.burntOrange,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructions: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
  instructionSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
  },
  permissionContainer: {
    margin: Spacing.xl,
    padding: Spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
    gap: Spacing.md,
  },
  permissionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
  },
  permissionButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    marginTop: Spacing.md,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  cancelButton: {
    paddingVertical: Spacing.sm,
  },
  cancelButtonText: {
    fontSize: Typography.fontSize.base,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  processingIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: BookLoopColors.burntOrange,
    borderTopColor: 'transparent',
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
});
