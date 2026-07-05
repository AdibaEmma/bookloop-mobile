import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
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
 * The centre FAB is a "list a book" action — pressing it opens the create-
 * listing flow rather than switching tabs. The `exchanges` screen it sits on
 * stays reachable via the "Swaps" stat on Home and Profile.
 */
export default function TabLayout() {
  const router = useRouter();
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
          height: Platform.OS === 'ios' ? 74 : 64,
          paddingBottom: Platform.OS === 'ios' ? 10 : 8,
          paddingTop: 6,
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
        name="exchanges"
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
          // instead of switching to the Exchanges screen.
          tabPress: (e) => {
            e.preventDefault();
            router.push('/listing/create');
          },
        }}
      />
      <Tabs.Screen
        name="listings"
        options={{
          title: 'My Listings',
          tabBarIcon: ({ color }) => <Repeat size={23} color={color} strokeWidth={1.8} />,
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
    width: 64,
    height: 64,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    marginTop: -18,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BookLoopColors.goldDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.65,
    shadowRadius: 12,
    elevation: 8,
  },
});
