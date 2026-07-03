/**
 * Profile Tab — design refresh 10d
 *
 * Warm cover banner + overlapping avatar, name, compact subscription pill,
 * bio, a Listed / Swaps / Karma stats strip, My-listings / Reviews tabs, and a
 * 2-column listings grid.
 *
 * Kept the app's real affordances the design doesn't draw (edit profile,
 * settings, subscription upsell, logout) but folded them in quietly so they
 * don't fight the cleaner layout. Rating/location text are omitted because the
 * User model doesn't carry them yet (location is coordinates only).
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Settings,
  Pencil,
  ChevronRight,
  Leaf,
  Star,
  Crown,
  LogOut,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { listingsService, exchangesService } from '@/services/api';
import { BookLoopColors, ConditionBadge } from '@/constants/theme';

const C = {
  bg: BookLoopColors.cream,
  text: BookLoopColors.deepEspresso,
  muted: BookLoopColors.authorText,
  active: BookLoopColors.coffeeBrown,
  cardBorder: '#EFE2CE',
  bodyText: '#6B5240',
  idleTab: '#B39C82',
};

const TIER = {
  free: { label: 'Free', Icon: Leaf, desc: 'Upgrade for premium features' },
  basic: { label: 'Basic', Icon: Star, desc: 'Extended listing limits' },
  premium: { label: 'Premium', Icon: Crown, desc: 'All features unlocked' },
} as const;

const SPINES = ['#C9A97E', '#B98A6B', '#9C7A56', '#BFA47C'];
function spineFor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return SPINES[h % SPINES.length];
}

export default function ProfileTab() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [listings, setListings] = useState<any[]>([]);
  const [swaps, setSwaps] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'listings' | 'reviews'>('listings');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [mine, requests] = await Promise.allSettled([
        listingsService.getMyListings('available'),
        exchangesService.getMyRequests(),
      ]);
      if (mine.status === 'fulfilled') setListings(mine.value ?? []);
      if (requests.status === 'fulfilled') {
        setSwaps((requests.value ?? []).filter((e: any) => e.status === 'completed').length);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { if (user) load(); }, [user, load]));

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/(auth)/welcome');
          } catch {
            Alert.alert('Error', 'Failed to log out');
          }
        },
      },
    ]);
  };

  if (!user) return null;

  const tier = (user.subscriptionTier || 'free') as keyof typeof TIER;
  const tierInfo = TIER[tier];
  const initials =
    ((user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '')).toUpperCase() || 'BL';

  const stats = [
    { value: listings.length, label: 'Listed' },
    { value: swaps, label: 'Swaps' },
    { value: user.karma ?? 0, label: 'Karma' },
  ];

  return (
    <View style={styles.container}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg }]} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
        {/* Cover banner */}
        <LinearGradient
          colors={[BookLoopColors.parchmentBeige, '#B98A6B']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.cover, { paddingTop: insets.top + 6 }]}
        >
          <TouchableOpacity
            style={styles.gear}
            onPress={() => router.push('/settings')}
            accessibilityLabel="Settings"
          >
            <Settings size={18} color={C.text} strokeWidth={2} />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.hpad}>
          {/* Avatar + name row */}
          <View style={styles.identityRow}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={styles.nameCol}>
              <Text style={styles.name}>
                {user.firstName} {user.lastName}
              </Text>
              <TouchableOpacity
                style={styles.tierPill}
                activeOpacity={0.8}
                onPress={() => router.push('/subscription')}
              >
                <tierInfo.Icon size={12} color={C.active} strokeWidth={2} />
                <Text style={styles.tierText}>{tierInfo.label} plan</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push('/profile/edit')}
              accessibilityLabel="Edit profile"
            >
              <Pencil size={16} color={C.active} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {!!user.bio && <Text style={styles.bio}>{user.bio}</Text>}

          {/* Stats strip */}
          <View style={styles.stats}>
            {stats.map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <View style={styles.statDivider} />}
                <View style={styles.statCell}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          {/* Subscription upsell (folded-in tier UI) */}
          {tier === 'free' && (
            <TouchableOpacity
              style={styles.upsell}
              activeOpacity={0.85}
              onPress={() => router.push('/subscription')}
            >
              <Crown size={18} color={BookLoopColors.goldDeep} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={styles.upsellTitle}>Go Premium</Text>
                <Text style={styles.upsellDesc}>{tierInfo.desc}</Text>
              </View>
              <ChevronRight size={18} color={C.active} strokeWidth={2} />
            </TouchableOpacity>
          )}

          {/* Tabs */}
          <View style={styles.tabs}>
            {(['listings', 'reviews'] as const).map((t) => {
              const on = tab === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTab(t);
                  }}
                  style={[styles.tab, on && styles.tabActive]}
                >
                  <Text style={[styles.tabText, { color: on ? C.active : C.idleTab }]}>
                    {t === 'listings' ? 'My listings' : 'Reviews'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Content */}
          {tab === 'listings' ? (
            loading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={C.active} />
              </View>
            ) : listings.length > 0 ? (
              <View style={styles.grid}>
                {listings.map((l) => {
                  const cond = ConditionBadge[l.condition as keyof typeof ConditionBadge] ?? ConditionBadge.good;
                  return (
                    <TouchableOpacity
                      key={l.id}
                      style={styles.gridCard}
                      activeOpacity={0.85}
                      onPress={() => router.push({ pathname: '/listing/[id]', params: { id: l.id } })}
                    >
                      {l.book?.coverImage ? (
                        <Image source={{ uri: l.book.coverImage }} style={styles.gridCover} />
                      ) : (
                        <View style={[styles.gridCover, { backgroundColor: spineFor(l.book?.title || l.id) }]} />
                      )}
                      <View style={styles.gridBody}>
                        <Text style={styles.gridTitle} numberOfLines={1}>
                          {l.book?.title || 'Untitled'}
                        </Text>
                        <Text style={styles.gridMeta} numberOfLines={1}>
                          {cond.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.tabEmpty}>
                <Text style={styles.tabEmptyTitle}>No listings yet</Text>
                <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/listing/create')}>
                  <Text style={styles.emptyCtaText}>List a book</Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            <View style={styles.tabEmpty}>
              <Text style={styles.tabEmptyTitle}>No reviews yet</Text>
              <Text style={styles.tabEmptyBody}>Reviews from your swap partners will appear here.</Text>
            </View>
          )}

          {/* Logout */}
          <TouchableOpacity style={styles.logout} onPress={handleLogout}>
            <LogOut size={18} color={BookLoopColors.error} strokeWidth={2} />
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cover: {
    height: 132,
    paddingHorizontal: 18,
    paddingBottom: 44,
  },
  gear: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,248,240,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hpad: { paddingHorizontal: 18 },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    marginTop: -38,
  },
  avatar: { width: 78, height: 78, borderRadius: 39, borderWidth: 3, borderColor: BookLoopColors.cream },
  avatarFallback: { backgroundColor: BookLoopColors.coffeeBrown, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: 'Poppins-Bold', fontSize: 26, color: BookLoopColors.cream },
  nameCol: { flex: 1, paddingBottom: 4 },
  name: { fontFamily: 'Poppins-Bold', fontSize: 19, color: C.text },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139,94,60,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tierText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: C.active, fontWeight: '600' },
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: C.cardBorder,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  bio: { fontFamily: 'Inter-Regular', fontSize: 12.5, color: C.bodyText, lineHeight: 19, marginTop: 12 },
  stats: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 13 },
  statDivider: { width: 1, backgroundColor: C.cardBorder, marginVertical: 10 },
  statValue: { fontFamily: 'Poppins-Bold', fontSize: 18, color: C.text, fontWeight: '800' },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: 10.5, color: C.muted, marginTop: 1 },
  upsell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginTop: 14,
    backgroundColor: 'rgba(255,213,128,0.22)',
    borderWidth: 1,
    borderColor: BookLoopColors.mutedGold,
    borderRadius: 14,
    padding: 13,
  },
  upsellTitle: { fontFamily: 'Inter-Bold', fontSize: 13.5, color: C.text, fontWeight: '700' },
  upsellDesc: { fontFamily: 'Inter-Regular', fontSize: 11.5, color: C.muted, marginTop: 1 },
  tabs: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  tab: { paddingBottom: 9 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: C.active },
  tabText: { fontFamily: 'Inter-SemiBold', fontSize: 13, fontWeight: '600' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 11,
  },
  gridCard: {
    width: '47.5%',
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  gridCover: { height: 96, width: '100%' },
  gridBody: { padding: 9 },
  gridTitle: { fontFamily: 'Inter-SemiBold', fontSize: 11.5, color: C.text, fontWeight: '600' },
  gridMeta: { fontFamily: 'Inter-Regular', fontSize: 9.5, color: C.muted, marginTop: 1 },
  loading: { paddingVertical: 40, alignItems: 'center' },
  tabEmpty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  tabEmptyTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 15, color: C.text, fontWeight: '600' },
  tabEmptyBody: { fontFamily: 'Inter-Regular', fontSize: 12.5, color: C.muted, textAlign: 'center', paddingHorizontal: 30 },
  emptyCta: {
    height: 42,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: C.active,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  emptyCtaText: { fontFamily: 'Inter-SemiBold', fontSize: 13.5, color: BookLoopColors.cream, fontWeight: '600' },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 26,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.4)',
  },
  logoutText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: BookLoopColors.error, fontWeight: '600' },
});
