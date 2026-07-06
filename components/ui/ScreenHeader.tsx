/**
 * ScreenHeader
 *
 * A warm, app-consistent header (back chevron in a soft chip + title, optional
 * right action) used in place of the native iOS stack header — whose back button
 * shows the previous screen's raw route name (e.g. "listing/[id]"). Handles its
 * own safe-area top inset. Set `transparent` when the screen already paints a
 * background (e.g. a gradient) behind it.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { BookLoopColors } from '@/constants/theme';

export function ScreenHeader({
  title,
  onBack,
  right,
  transparent = false,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  transparent?: boolean;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: insets.top + 6 },
        !transparent && styles.solid,
      ]}
    >
      <TouchableOpacity
        style={styles.back}
        onPress={onBack ?? (() => router.back())}
        accessibilityLabel="Back"
        hitSlop={8}
      >
        <ChevronLeft size={20} color={BookLoopColors.deepEspresso} strokeWidth={2} />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  solid: { backgroundColor: BookLoopColors.cream },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1E7D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: 'Poppins-SemiBold',
    fontSize: 17,
    fontWeight: '600',
    color: BookLoopColors.deepEspresso,
  },
  right: { minWidth: 36, alignItems: 'flex-end' },
});
