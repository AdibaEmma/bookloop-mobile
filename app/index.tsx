/**
 * App Entry Point
 *
 * Handles initial routing logic:
 * - Show onboarding for first-time users
 * - Show auth screens for unauthenticated users
 * - Show main app for authenticated users
 */

import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { SplashScreen } from '@/components/ui/SplashScreen';

export default function Index() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuth();
  const [minSplashTimeElapsed, setMinSplashTimeElapsed] = useState(false);

  // Ensure splash screen shows for minimum duration (animation time)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashTimeElapsed(true);
    }, 4500); // Match the animation duration

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Only proceed with routing when:
    // 1. Auth loading is complete
    // 2. Minimum splash time has elapsed
    if (isLoading || !minSplashTimeElapsed) return;

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
            // Redirect unauthenticated users to login screen
            router.replace('/(auth)/login');
          }
        }
      } catch (error) {
        console.error('Failed to check initial route:', error);
        // Fallback to onboarding
        router.replace('/onboarding');
      }
    };

    checkInitialRoute();
  }, [isAuthenticated, isLoading, minSplashTimeElapsed, segments]);

  // Show beautiful splash screen while checking auth status and loading data
  if (isLoading || !minSplashTimeElapsed) {
    return (
      <SplashScreen
        onAnimationComplete={() => {
          // Animation complete callback - handled by timeout above
        }}
      />
    );
  }

  // Fallback view (should rarely be seen)
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
