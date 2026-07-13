import { Tabs } from 'expo-router';
import React from 'react';

import { ShelfDock } from '@/components/ShelfDock';

/**
 * Tab navigator — rendering is fully delegated to ShelfDock (the floating
 * warm dock with the gold "+" action in the centre).
 *
 * Route order defines the dock order: Home / Explore / [+] / Swaps / Profile.
 * The `listings` route hosts My Listings (reachable via Profile → Manage);
 * the dock renders its slot as the create-listing action instead.
 */
export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <ShelfDock {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="listings" />
      <Tabs.Screen name="exchanges" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
