/**
 * App Entry Point
 *
 * Handles initial routing logic:
 * - Show onboarding for first-time users
 * - Show auth screens for unauthenticated users
 * - Show main app for authenticated users
 */

import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { BookLoopColors } from '@/constants/theme';

export default function Index() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const checkInitialRoute = async () => {
      try {
        // Check if user has seen onboarding
        const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');

        if (!hasSeenOnboarding) {
          // First time user - show onboarding
          router.replace('/onboarding');
          return;
        }

        // Check authentication status
        if (isAuthenticated) {
          // User is logged in - go to main app
          router.replace('/(tabs)');
        } else {
          // User is not logged in - go to auth
          router.replace('/(auth)/welcome');
        }
      } catch (error) {
        console.error('Failed to check initial route:', error);
        // Fallback to onboarding
        router.replace('/onboarding');
      }
    };

    checkInitialRoute();
  }, [isAuthenticated, isLoading]);

  // Show loading screen while checking auth status
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[BookLoopColors.cream, BookLoopColors.lightPeach]}
        style={StyleSheet.absoluteFillObject}
      />
      <ActivityIndicator size="large" color={BookLoopColors.burntOrange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
