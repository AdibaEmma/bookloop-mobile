import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, Compass, Plus, Repeat, User } from 'lucide-react-native';

import { HapticTab } from '@/components/haptic-tab';
import { BookLoopColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Tab bar — design refresh.
 *
 * Warm glass bar with a gold FAB in the centre. Icon set matches the design
 * (Home / Explore / [+] / Swaps / Profile) via lucide-react-native.
 *
 * Bar: Home / Explore / [+ list a book] / Swaps / Profile.
 *
 * The centre FAB opens the create-listing flow (it hosts the `listings` route
 * but redirects on press, so it never shows My Listings — that lives on the
 * Profile). `exchanges` is the "Swaps" tab.
 */
export default function TabLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const isDark = scheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isDark ? BookLoopColors.burntOrange : BookLoopColors.coffeeBrown,
        tabBarInactiveTintColor: isDark ? '#8C7660' : '#B39C82',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: isDark ? '#1C150F' : BookLoopColors.cream,
          borderTopColor: isDark ? BookLoopColors.darkBorder : 'rgba(139,94,60,0.1)',
          borderTopWidth: 1,
          // Size the bar AROUND the home-indicator inset. A hardcoded 74pt
          // absorbed the ~34pt inset, leaving ~40pt of touch area half inside
          // the system gesture zone — taps constantly missed.
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter-Regular',
          fontSize: 9.5,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Home
              size={23}
              color={color}
              strokeWidth={1.8}
              fill={focused ? BookLoopColors.mutedGold : 'transparent'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <Compass size={23} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="listings"
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={[styles.fabWrap, { backgroundColor: isDark ? '#1C150F' : BookLoopColors.cream }]}>
              <LinearGradient
                colors={[BookLoopColors.mutedGold, BookLoopColors.goldDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.fab}
              >
                <Plus size={26} color={BookLoopColors.deepEspresso} strokeWidth={2.4} />
              </LinearGradient>
            </View>
          ),
          tabBarButton: (props) => <HapticTab {...props} style={styles.fabButton} />,
          tabBarAccessibilityLabel: 'List a book',
        }}
        listeners={{
          // The FAB is a "list a book" action, not a tab — open create-listing
          // instead of switching to the (bar-hidden) My Listings screen.
          tabPress: (e) => {
            e.preventDefault();
            router.push('/listing/create');
          },
        }}
      />
      <Tabs.Screen
        name="exchanges"
        options={{
          title: 'Swaps',
          tabBarIcon: ({ color, focused }) => (
            <Repeat
              size={23}
              color={color}
              strokeWidth={1.8}
              fill={focused ? BookLoopColors.mutedGold : 'transparent'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={23} color={color} strokeWidth={1.8} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fabButton: {
    top: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabWrap: {
    width: 60,
    height: 60,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    marginTop: -8,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BookLoopColors.goldDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.65,
    shadowRadius: 12,
    elevation: 8,
  },
});
