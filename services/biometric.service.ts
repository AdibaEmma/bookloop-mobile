/**
 * Biometric Authentication Service
 *
 * Handles Face ID, Touch ID, and Fingerprint authentication.
 * Uses expo-local-authentication for biometric checks
 * and expo-secure-store for secure credential storage.
 *
 * Features:
 * - Check device biometric capability
 * - Authenticate with Face ID / Touch ID / Fingerprint
 * - Securely store and retrieve credentials
 * - Enable/disable biometric login preference
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform, Alert } from 'react-native';

// Secure store keys
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const STORED_CREDENTIALS_KEY = 'stored_credentials';
const USER_ID_KEY = 'biometric_user_id';

// Types
export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

export interface BiometricCapability {
  isAvailable: boolean;
  biometricType: BiometricType;
  isEnrolled: boolean;
  securityLevel: LocalAuthentication.SecurityLevel;
}

export interface StoredCredentials {
  phone: string;
  userId: string;
  token?: string;
}

/**
 * Biometric Authentication Service
 */
export const biometricService = {
  /**
   * Check if device supports biometric authentication
   */
  async checkBiometricCapability(): Promise<BiometricCapability> {
    try {
      // Check if hardware is available
      const isAvailable = await LocalAuthentication.hasHardwareAsync();

      if (!isAvailable) {
        return {
          isAvailable: false,
          biometricType: 'none',
          isEnrolled: false,
          securityLevel: LocalAuthentication.SecurityLevel.NONE,
        };
      }

      // Check if biometrics are enrolled
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      // Get supported authentication types
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      // Determine primary biometric type
      let biometricType: BiometricType = 'none';
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'facial';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'fingerprint';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometricType = 'iris';
      }

      // Get security level
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();

      return {
        isAvailable: true,
        biometricType,
        isEnrolled,
        securityLevel,
      };
    } catch (error) {
      console.error('Failed to check biometric capability:', error);
      return {
        isAvailable: false,
        biometricType: 'none',
        isEnrolled: false,
        securityLevel: LocalAuthentication.SecurityLevel.NONE,
      };
    }
  },

  /**
   * Get human-readable biometric type name
   */
  getBiometricTypeName(type: BiometricType): string {
    switch (type) {
      case 'facial':
        return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
      case 'fingerprint':
        return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
      case 'iris':
        return 'Iris Recognition';
      default:
        return 'Biometric';
    }
  },

  /**
   * Authenticate using biometrics
   */
  async authenticate(
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const capability = await this.checkBiometricCapability();

      if (!capability.isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device',
        };
      }

      if (!capability.isEnrolled) {
        return {
          success: false,
          error: `No ${this.getBiometricTypeName(capability.biometricType)} enrolled. Please set up biometrics in your device settings.`,
        };
      }

      const promptMessage =
        reason || `Sign in with ${this.getBiometricTypeName(capability.biometricType)}`;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      }

      // Handle specific error cases
      if (result.error === 'user_cancel') {
        return { success: false, error: 'Authentication cancelled' };
      }

      if (result.error === 'user_fallback') {
        return { success: false, error: 'fallback_requested' };
      }

      if (result.error === 'lockout') {
        return {
          success: false,
          error: 'Too many failed attempts. Please try again later or use your password.',
        };
      }

      return {
        success: false,
        error: result.error || 'Authentication failed',
      };
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: error.message || 'Authentication failed',
      };
    }
  },

  /**
   * Check if biometric login is enabled for the user
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Failed to check biometric enabled status:', error);
      return false;
    }
  },

  /**
   * Enable biometric login
   * Stores credentials securely for future biometric authentication
   */
  async enableBiometric(credentials: StoredCredentials): Promise<boolean> {
    try {
      // Verify biometric capability first
      const capability = await this.checkBiometricCapability();
      if (!capability.isAvailable || !capability.isEnrolled) {
        Alert.alert(
          'Biometric Not Available',
          `Please set up ${this.getBiometricTypeName(capability.biometricType)} in your device settings first.`
        );
        return false;
      }

      // Authenticate to confirm user identity
      const authResult = await this.authenticate(
        'Verify your identity to enable biometric login'
      );

      if (!authResult.success) {
        if (authResult.error !== 'Authentication cancelled') {
          Alert.alert('Authentication Failed', authResult.error);
        }
        return false;
      }

      // Store credentials securely
      await SecureStore.setItemAsync(
        STORED_CREDENTIALS_KEY,
        JSON.stringify(credentials)
      );
      await SecureStore.setItemAsync(USER_ID_KEY, credentials.userId);
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');

      return true;
    } catch (error) {
      console.error('Failed to enable biometric:', error);
      Alert.alert('Error', 'Failed to enable biometric login. Please try again.');
      return false;
    }
  },

  /**
   * Disable biometric login
   * Removes stored credentials
   */
  async disableBiometric(): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync(STORED_CREDENTIALS_KEY);
      await SecureStore.deleteItemAsync(USER_ID_KEY);
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'false');
      return true;
    } catch (error) {
      console.error('Failed to disable biometric:', error);
      return false;
    }
  },

  /**
   * Get stored credentials after successful biometric authentication
   */
  async getStoredCredentials(): Promise<StoredCredentials | null> {
    try {
      const credentialsJson = await SecureStore.getItemAsync(STORED_CREDENTIALS_KEY);
      if (!credentialsJson) {
        return null;
      }
      return JSON.parse(credentialsJson);
    } catch (error) {
      console.error('Failed to get stored credentials:', error);
      return null;
    }
  },

  /**
   * Get stored user ID (for checking if biometric is set up for current user)
   */
  async getStoredUserId(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(USER_ID_KEY);
    } catch (error) {
      console.error('Failed to get stored user ID:', error);
      return null;
    }
  },

  /**
   * Authenticate and retrieve credentials in one step
   * Used for biometric login flow
   */
  async authenticateAndGetCredentials(): Promise<{
    success: boolean;
    credentials?: StoredCredentials;
    error?: string;
  }> {
    try {
      // Check if biometric is enabled
      const isEnabled = await this.isBiometricEnabled();
      if (!isEnabled) {
        return {
          success: false,
          error: 'Biometric login is not enabled',
        };
      }

      // Get stored credentials
      const credentials = await this.getStoredCredentials();
      if (!credentials) {
        return {
          success: false,
          error: 'No stored credentials found. Please log in with your password.',
        };
      }

      // Authenticate with biometrics
      const authResult = await this.authenticate('Sign in to BookLoop');

      if (!authResult.success) {
        return {
          success: false,
          error: authResult.error,
        };
      }

      return {
        success: true,
        credentials,
      };
    } catch (error: any) {
      console.error('Biometric login error:', error);
      return {
        success: false,
        error: error.message || 'Biometric login failed',
      };
    }
  },

  /**
   * Update stored token (for token refresh scenarios)
   */
  async updateStoredToken(token: string): Promise<boolean> {
    try {
      const credentials = await this.getStoredCredentials();
      if (!credentials) {
        return false;
      }

      credentials.token = token;
      await SecureStore.setItemAsync(
        STORED_CREDENTIALS_KEY,
        JSON.stringify(credentials)
      );
      return true;
    } catch (error) {
      console.error('Failed to update stored token:', error);
      return false;
    }
  },

  /**
   * Clear all biometric data (for logout)
   */
  async clearAll(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORED_CREDENTIALS_KEY);
      await SecureStore.deleteItemAsync(USER_ID_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    } catch (error) {
      console.error('Failed to clear biometric data:', error);
    }
  },
};

export default biometricService;
