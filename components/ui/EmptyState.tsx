import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Search } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BookLoopColors } from '@/constants/theme';

/**
 * EmptyState — design refresh 10e
 *
 * Friendly hand-drawn open-book doodle + title + body + optional CTA.
 * Shared across empty feeds/tabs (Home, Exchanges, etc.).
 */

type IconType = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface Props {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Icon shown in the CTA. Defaults to a magnifier (browse); pass e.g. BookPlus
   *  for a "list a book" action so the icon matches the verb. */
  actionIcon?: IconType;
}

function BookDoodle({ dark }: { dark: boolean }) {
  const spine = dark ? '#6B5844' : '#B98A6B';
  const lines = dark ? '#4A3B2C' : '#DCC7A6';
  const leftPage = dark ? '#2A211B' : '#FBF1DF';
  const rightPage = dark ? '#332920' : '#ffffff';
  return (
    <Svg width={140} height={116} viewBox="0 0 140 116" fill="none">
      <Path
        d="M70 30 C50 18, 24 20, 14 26 L14 92 C24 86, 50 84, 70 96"
        stroke={spine}
        strokeWidth={3}
        strokeLinejoin="round"
        fill={leftPage}
      />
      <Path
        d="M70 30 C90 18, 116 20, 126 26 L126 92 C116 86, 90 84, 70 96"
        stroke={spine}
        strokeWidth={3}
        strokeLinejoin="round"
        fill={rightPage}
      />
      <Path d="M70 30 L70 96" stroke={spine} strokeWidth={3} strokeLinecap="round" />
      <Path d="M26 40 H58 M26 52 H54 M26 64 H58" stroke={lines} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M82 40 H114 M86 52 H114 M82 64 H110" stroke={lines} strokeWidth={2.5} strokeLinecap="round" />
      <Path
        d="M104 12 l2.5 5 5 2.5 -5 2.5 -2.5 5 -2.5 -5 -5 -2.5 5 -2.5 z"
        fill={BookLoopColors.mutedGold}
        stroke={BookLoopColors.goldDeep}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <Circle cx={30} cy={20} r={3} fill={BookLoopColors.mutedGold} />
    </Svg>
  );
}

export function EmptyState({ title, body, actionLabel, onAction, actionIcon: ActionIcon = Search }: Props) {
  const isDark = (useColorScheme() ?? 'light') === 'dark';
  const text = isDark ? BookLoopColors.darkText : BookLoopColors.deepEspresso;
  const muted = isDark ? BookLoopColors.darkTextMuted : BookLoopColors.authorText;

  return (
    <View style={styles.wrap}>
      <BookDoodle dark={isDark} />
      <Text style={[styles.title, { color: text }]}>{title}</Text>
      {!!body && <Text style={[styles.body, { color: muted }]}>{body}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.action}
          activeOpacity={0.85}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAction();
          }}
        >
          <ActionIcon size={18} color={BookLoopColors.cream} strokeWidth={2} />
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 18,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 7,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: BookLoopColors.coffeeBrown,
    marginTop: 22,
    shadowColor: BookLoopColors.coffeeBrown,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 6,
  },
  actionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14.5,
    fontWeight: '600',
    color: BookLoopColors.cream,
  },
});
