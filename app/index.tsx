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
        const inAuthGroup = segments[0] === '(auth)';
        const inTabsGroup = segments[0] === '(tabs)';

        if (!hasSeenOnboarding) {
          // First time user - show onboarding
          router.replace('/onboarding');
          return;
        }

        // Check authentication status
        if (isAuthenticated) {
          // User is logged in
          if (inAuthGroup) {
            // Prevent authenticated users from accessing auth screens
            router.replace('/(tabs)');
          } else if (!inTabsGroup) {
            // Navigate to main app if not already there
            router.replace('/(tabs)');
          }
        } else {
          // User is not logged in
          if (!inAuthGroup) {
            // Redirect unauthenticated users to auth screens
            router.replace('/(auth)/welcome');
          }
        }
      } catch (error) {
        console.error('Failed to check initial route:', error);
        // Fallback to onboarding
        router.replace('/onboarding');
      }
    };

    checkInitialRoute();
  }, [isAuthenticated, isLoading, segments]);

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
