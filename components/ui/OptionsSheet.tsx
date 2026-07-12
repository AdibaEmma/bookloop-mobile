/**
 * OptionsSheet
 *
 * Warm, app-themed bottom action sheet — replaces ActionSheetIOS / the
 * Android Alert-menu fallback so contextual actions look like BookLoop on
 * both platforms. Slide-up card on a dim backdrop; destructive rows use the
 * warm brick tone; a full-width Cancel closes it.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BookLoopColors } from '@/constants/theme';

const DESTRUCTIVE = '#C15B3F'; // warm brick, matches ConfirmModal

export interface SheetOption {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
}

export function OptionsSheet({
  visible,
  title,
  options,
  onClose,
}: {
  visible: boolean;
  title?: string;
  options: SheetOption[];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const isDark = (useColorScheme() ?? 'light') === 'dark';
  const t = isDark
    ? {
        sheet: '#2C1F18',
        handle: 'rgba(228,212,192,0.25)',
        title: '#B39C82',
        label: '#F3E8DA',
        icon: '#CBB79F',
        divider: 'rgba(228,212,192,0.08)',
        cancelBg: 'rgba(228,212,192,0.08)',
      }
    : {
        sheet: BookLoopColors.cream,
        handle: 'rgba(74,53,40,0.2)',
        title: '#8A7561',
        label: BookLoopColors.deepEspresso,
        icon: BookLoopColors.coffeeBrown,
        divider: 'rgba(139,94,60,0.10)',
        cancelBg: 'rgba(139,94,60,0.08)',
      };

  const pick = (opt: SheetOption) => {
    onClose();
    // Let the sheet dismiss before the action runs (nav pushes, modals).
    setTimeout(opt.onPress, 120);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: t.sheet, paddingBottom: insets.bottom + 10 }]}
          onPress={() => {}}
        >
          <View style={[styles.handle, { backgroundColor: t.handle }]} />
          {!!title && (
            <Text style={[styles.title, { color: t.title }]} numberOfLines={1}>
              {title}
            </Text>
          )}

          {options.map((opt, i) => (
            <TouchableOpacity
              key={opt.label}
              style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: t.divider }]}
              activeOpacity={0.75}
              onPress={() => pick(opt)}
            >
              {opt.icon && (
                <Ionicons
                  name={opt.icon}
                  size={19}
                  color={opt.destructive ? DESTRUCTIVE : t.icon}
                />
              )}
              <Text style={[styles.label, { color: opt.destructive ? DESTRUCTIVE : t.label }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.cancel, { backgroundColor: t.cancelBg }]}
            activeOpacity={0.8}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: t.label }]}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,12,6,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    height: 52,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    fontWeight: '600',
  },
  cancel: {
    height: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  cancelText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14.5,
    fontWeight: '600',
  },
});
