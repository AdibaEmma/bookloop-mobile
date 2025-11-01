import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/contexts/AuthContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="search" />
          <Stack.Screen name="listing/[id]" />
          <Stack.Screen name="listing/create" />
          <Stack.Screen name="listings/my-listings" />
          <Stack.Screen name="exchange/request" />
          <Stack.Screen name="exchange/my-exchanges" />
          <Stack.Screen name="exchange/rate/[id]" />
          <Stack.Screen name="profile/[id]" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="subscription" />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
        </Stack>
        <StatusBar style="auto" />
        <Toast />
      </ThemeProvider>
    </AuthProvider>
  );
}
