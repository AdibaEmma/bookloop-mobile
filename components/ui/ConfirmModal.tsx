/**
 * ConfirmModal
 *
 * A warm, app-themed confirmation dialog to replace the OS `Alert.alert` prompt.
 * Centered card over a dim backdrop, two actions (cancel + confirm). Set
 * `destructive` to colour the confirm action for downgrades/deletes.
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BookLoopColors } from '@/constants/theme';

const DESTRUCTIVE = '#C15B3F'; // warm brick — signals caution without alarming red

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={loading ? undefined : onCancel}>
      <Pressable style={styles.backdrop} onPress={loading ? undefined : onCancel}>
        {/* stop taps inside the card from dismissing */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn, loading && styles.btnDisabled]}
              activeOpacity={0.85}
              disabled={loading}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.confirmBtn, destructive && styles.confirmDestructive]}
              activeOpacity={0.9}
              disabled={loading}
              onPress={onConfirm}
            >
              {loading ? (
                <ActivityIndicator size="small" color={BookLoopColors.cream} />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(40,28,18,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: BookLoopColors.cream,
    borderRadius: 20,
    padding: 22,
    shadowColor: '#2A1B0E',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 30,
    elevation: 12,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    fontWeight: '700',
    color: BookLoopColors.deepEspresso,
  },
  message: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    lineHeight: 20,
    color: '#6B5240',
    marginTop: 8,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E4D8C4',
  },
  btnDisabled: { opacity: 0.5 },
  cancelText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14.5,
    fontWeight: '600',
    color: BookLoopColors.deepEspresso,
  },
  confirmBtn: { backgroundColor: BookLoopColors.coffeeBrown },
  confirmDestructive: { backgroundColor: DESTRUCTIVE },
  confirmText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14.5,
    fontWeight: '600',
    color: BookLoopColors.cream,
  },
});
