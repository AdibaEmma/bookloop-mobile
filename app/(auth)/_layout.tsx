import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false, // Disable swipe back gesture
        animation: 'fade',
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="phone-input" />
      <Stack.Screen name="login" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="profile-setup" />
    </Stack>
  );
}
