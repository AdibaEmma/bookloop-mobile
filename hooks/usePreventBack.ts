/**
 * usePreventBack Hook
 *
 * Prevents users from going back using Android hardware back button
 * or swipe gestures after authentication
 */

import { useEffect } from 'react';
import { BackHandler } from 'react-native';

export function usePreventBack() {
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        // Return true to prevent default back behavior
        return true;
      }
    );

    return () => backHandler.remove();
  }, []);
}
