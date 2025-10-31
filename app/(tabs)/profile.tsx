/**
 * Profile Tab
 *
 * Navigate to current user's profile with settings access
 */

import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileTab() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return <Redirect href="/settings" />;
}
