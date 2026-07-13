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

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
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
  Plus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { reverseGeocode } from '@/utils/geocode';
import { StatsStrip, ConfirmModal } from '@/components/ui';
import { showErrorAlert } from '@/components/ui/AlertManager';
import type { StatItem } from '@/components/ui';
import { BookCover } from '@/components/ui/BookCover';
import { listingsService, exchangesService, paymentsService } from '@/services/api';
import { BookLoopColors, ConditionBadge } from '@/constants/theme';

const LIGHT_C = {
  bg: BookLoopColors.cream,
  text: BookLoopColors.deepEspresso,
  muted: BookLoopColors.authorText,
  active: BookLoopColors.coffeeBrown,
  cardBorder: '#EFE2CE',
  bodyText: '#6B5240',
  idleTab: '#B39C82',
  cardBg: '#fff',
  statText: '#4A3528',
  bannerGrad: ['#F4E1C1', '#D8B48A'] as readonly [string, string],
  premIconBg: 'rgba(255,213,128,0.35)',
  softBorder: '#D4C0A0',
  tintBg: 'rgba(139,94,60,0.09)',
};

const DARK_C: typeof LIGHT_C = {
  bg: BookLoopColors.darkBg,
  text: BookLoopColors.darkText,
  muted: BookLoopColors.darkTextMuted,
  active: BookLoopColors.burntOrange,
  cardBorder: '#3D2E24',
  bodyText: '#C9B8A3',
  idleTab: '#8C7660',
  cardBg: '#2C1F18',
  statText: '#E4D4C0',
  // Deeper gold so the banner sits into the dark canvas instead of glaring.
  bannerGrad: ['#C9A87C', '#8F6B45'] as readonly [string, string],
  premIconBg: 'rgba(255,213,128,0.16)',
  softBorder: '#4A4238',
  tintBg: 'rgba(217,121,65,0.12)',
};

const TIER = {
  free: { label: 'Free', Icon: Leaf, desc: 'Upgrade for premium features' },
  basic: { label: 'Basic', Icon: Star, desc: 'Extended listing limits' },
  premium: { label: 'Premium', Icon: Crown, desc: 'All features unlocked' },
} as const;

export default function ProfileTab() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const C = scheme === 'dark' ? DARK_C : LIGHT_C;
  const styles = useMemo(() => makeStyles(C), [C]);

  const [listings, setListings] = useState<any[]>([]);
  const [swaps, setSwaps] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'listings' | 'reviews'>('listings');
  const [city, setCity] = useState<string | null>(null);
  // Read the plan from the authoritative subscription, not the denormalized
  // user.subscriptionTier cache (which can lag behind an upgrade).
  const [planTier, setPlanTier] = useState<'free' | 'basic' | 'premium'>(
    (user?.subscriptionTier as 'free' | 'basic' | 'premium') || 'free',
  );
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [mine, requests, sub] = await Promise.allSettled([
        listingsService.getMyListings('available'),
        exchangesService.getMyRequests(),
        paymentsService.getCurrentSubscription(),
      ]);
      if (mine.status === 'fulfilled') setListings(mine.value ?? []);
      if (requests.status === 'fulfilled') {
        setSwaps((requests.value ?? []).filter((e: any) => e.status === 'completed').length);
      }
      if (sub.status === 'fulfilled' && sub.value?.tier) {
        setPlanTier(sub.value.tier);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        load();
        // Re-fetch the user so plan/karma changes (e.g. after an upgrade) show
        // when returning to this tab.
        refreshUser().catch(() => {});
      }
      // refreshUser is intentionally excluded — it's stable and would re-run the effect.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, load]),
  );

  // Turn the stored coordinates into a friendly place name for the header.
  // Depend on the coordinate values, not the location object — refreshUser()
  // recreates the object every tab focus, which would re-run this effect (and
  // re-hit the geocoder) for identical coordinates.
  const [lng, lat] = user?.location?.coordinates ?? [];
  useEffect(() => {
    if (lat == null || lng == null) return;
    let cancelled = false;
    (async () => {
      // Best-effort; cached + deduped, resolves null on failure.
      const place = await reverseGeocode(lat, lng);
      if (!cancelled && place) setCity(place.city || place.region || place.subregion || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setLogoutVisible(true);
  };

  const confirmLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      setLogoutVisible(false);
      router.replace('/(auth)/welcome');
    } catch {
      setLogoutVisible(false);
      showErrorAlert('Could not log out. Please try again.', 'Logout failed');
    } finally {
      setLoggingOut(false);
    }
  };

  if (!user) return null;

  const tier = planTier as keyof typeof TIER;
  const tierInfo = TIER[tier];

  // A warm "reading identity" line, e.g. "Reader since Jul 2026 · Accra".
  const memberSince = (() => {
    try {
      const d = new Date(user.createdAt);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    } catch {
      return null;
    }
  })();
  const identityBits = [memberSince ? `Reader since ${memberSince}` : null, city]
    .filter(Boolean)
    .join(' · ');
  const karma = user.karma ?? 0;
  const initials =
    ((user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '')).toUpperCase() || 'BL';

  const stats: StatItem[] = [
    { value: listings.length, label: 'Listed', icon: 'listed', onPress: () => setTab('listings') },
    { value: swaps, label: 'Swaps', icon: 'swaps', onPress: () => router.push('/(tabs)/exchanges') },
    { value: user.karma ?? 0, label: 'Karma', icon: 'karma' },
  ];

  return (
    <View style={styles.container}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg }]} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 28 }}>
        {/* Cover banner */}
        <LinearGradient
          colors={C.bannerGrad}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.cover, { paddingTop: insets.top + 6 }]}
        >
          <View style={styles.bannerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/profile/edit')}
              accessibilityLabel="Edit profile"
            >
              <Pencil size={17} color={C.active} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/settings')}
              accessibilityLabel="Settings"
            >
              <Settings size={17} color={C.text} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Identity — avatar + name, inside the header band */}
          <View style={styles.identityRow}>
            <View style={styles.avatarWrap}>
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              <View style={styles.karmaBadgeWrap} pointerEvents="none">
                <View style={styles.karmaBadge}>
                  <Crown size={10} color="#5A3E1E" strokeWidth={2} fill="#5A3E1E" />
                  <Text style={styles.karmaBadgeText}>{karma}</Text>
                </View>
              </View>
            </View>
            <View style={styles.nameCol}>
              <Text style={styles.name} numberOfLines={1}>
                {user.firstName} {user.lastName}
              </Text>
              <View style={styles.metaRow}>
                <TouchableOpacity
                  style={styles.tierPill}
                  activeOpacity={0.8}
                  onPress={() => router.push('/subscription')}
                >
                  <tierInfo.Icon size={12} color={C.active} strokeWidth={2} />
                  <Text style={styles.tierText}>{tierInfo.label} plan</Text>
                </TouchableOpacity>
                {!!identityBits && <Text style={styles.since}>{identityBits}</Text>}
              </View>
            </View>
          </View>
          {!!user.bio && (
            <Text style={styles.bio} numberOfLines={2}>
              {user.bio}
            </Text>
          )}
        </LinearGradient>

        <View style={styles.hpad}>

          {/* Stats strip — warm tinted chips, shared with Home */}
          <View style={styles.statsWrap}>
            <StatsStrip stats={stats} />
          </View>

          {/* Subscription upsell — calmer white card */}
          {tier === 'free' && (
            <TouchableOpacity
              style={styles.upsell}
              activeOpacity={0.85}
              onPress={() => router.push('/subscription')}
            >
              <View style={styles.upsellIcon}>
                <Crown size={20} color="#B07D22" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.upsellTitle}>Go Premium</Text>
                <Text style={styles.upsellDesc}>Boosts, unlimited listings &amp; more</Text>
              </View>
              <ChevronRight size={18} color={C.idleTab} strokeWidth={2} />
            </TouchableOpacity>
          )}

          {/* Tabs */}
          <View style={styles.tabs}>
            <View style={styles.tabsLeft}>
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
            {tab === 'listings' && listings.length > 0 && (
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => router.push('/(tabs)/listings')}
                accessibilityLabel="Manage listings"
              >
                <Text style={styles.manageText}>Manage</Text>
                <ChevronRight size={13} color={C.active} strokeWidth={2.2} />
              </TouchableOpacity>
            )}
          </View>

          {/* Content — fills the space between tabs and logout */}
          <View style={styles.tabContent}>
          {tab === 'listings' ? (
            loading && listings.length === 0 ? (
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
                      <View style={styles.gridCover}>
                        <BookCover
                          title={l.book?.title || 'Untitled'}
                          author={l.book?.author}
                          coverImage={l.book?.coverImage}
                          size="lg"
                          fill
                        />
                      </View>
                      <View style={styles.gridBody}>
                        <Text style={styles.gridTitle} numberOfLines={1}>
                          {l.book?.title || 'Untitled'}
                        </Text>
                        <View style={[styles.condPill, { backgroundColor: cond[scheme].bg }]}>
                          <Text style={[styles.condText, { color: cond[scheme].fg }]}>{cond.label}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={styles.addTile}
                  activeOpacity={0.8}
                  onPress={() => router.push('/listing/create')}
                  accessibilityLabel="List a book"
                >
                  <View style={styles.addTileIcon}>
                    <Plus size={22} color={C.active} strokeWidth={2.2} />
                  </View>
                  <Text style={styles.addTileText}>List a book</Text>
                </TouchableOpacity>
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
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logout} onPress={handleLogout}>
            <LogOut size={18} color={BookLoopColors.error} strokeWidth={2} />
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Log out confirmation — themed modal instead of the OS alert */}
      <ConfirmModal
        visible={logoutVisible}
        title="Log out"
        message="Are you sure you want to log out?"
        confirmLabel="Log out"
        destructive
        loading={loggingOut}
        onConfirm={confirmLogout}
        onCancel={() => setLogoutVisible(false)}
      />
    </View>
  );
}

const makeStyles = (C: typeof LIGHT_C) =>
  StyleSheet.create({
  container: { flex: 1 },
  cover: {
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  bannerActions: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,248,240,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(139,94,60,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hpad: { flex: 1, paddingHorizontal: 18 },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginTop: 8,
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 3,
    borderColor: BookLoopColors.cream,
    shadowColor: '#3A2A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 5,
  },
  avatarFallback: { backgroundColor: BookLoopColors.coffeeBrown, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: 'Poppins-Bold', fontSize: 26, color: BookLoopColors.cream },
  avatarWrap: { position: 'relative' },
  karmaBadgeWrap: {
    position: 'absolute',
    bottom: -7,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  karmaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: BookLoopColors.mutedGold,
    borderRadius: 11,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: BookLoopColors.cream,
  },
  karmaBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10.5,
    fontWeight: '700',
    color: BookLoopColors.deepEspresso,
  },
  nameCol: { flex: 1 },
  name: { fontFamily: 'Poppins-Bold', fontSize: 21, color: C.text },
  metaRow: {
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 8,
  },
  since: { fontFamily: 'Inter-Medium', fontSize: 11.5, color: '#6B5240', fontWeight: '500' },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,248,240,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tierText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: '#6B5240', fontWeight: '600' },
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: C.cardBorder,
    backgroundColor: C.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bio: {
    // The reader's own voice — set in the literary italic so it reads as a
    // personal note, clearly distinct from the factual "Reader since" line.
    fontFamily: 'LibreBaskerville-Italic',
    fontSize: 13,
    color: C.statText,
    lineHeight: 19,
    marginTop: 10,
    marginLeft: 97, // align with the name column (avatar 82 + gap 15)
  },
  statsWrap: { marginTop: 16 },
  upsell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: '#F0D9A8',
    borderRadius: 14,
    padding: 13,
  },
  upsellIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.premIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upsellTitle: { fontFamily: 'Inter-Bold', fontSize: 14, color: C.text, fontWeight: '700' },
  upsellDesc: { fontFamily: 'Inter-Regular', fontSize: 11.5, color: C.muted, marginTop: 1 },
  addTile: {
    width: '47.5%',
    minHeight: 200,
    borderWidth: 1.5,
    borderColor: C.softBorder,
    borderStyle: 'dashed',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addTileIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.tintBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTileText: { fontFamily: 'Inter-SemiBold', fontSize: 12.5, fontWeight: '600', color: C.active },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  tabsLeft: { flexDirection: 'row', gap: 20 },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingBottom: 9 },
  manageText: { fontFamily: 'Inter-SemiBold', fontSize: 12, fontWeight: '600', color: C.active },
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
    backgroundColor: C.cardBg,
  },
  gridCover: { width: '100%', aspectRatio: 0.72, overflow: 'hidden' },
  gridBody: { padding: 10 },
  gridTitle: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: C.text, fontWeight: '600' },
  condPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  condText: { fontFamily: 'Inter-SemiBold', fontSize: 9, fontWeight: '600' },
  tabContent: { flex: 1, minHeight: 200 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  tabEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40, gap: 8 },
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
    gap: 7,
    marginTop: 20,
    paddingTop: 18,
    height: 56,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
  },
  logoutText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: BookLoopColors.error, fontWeight: '600' },
  });
