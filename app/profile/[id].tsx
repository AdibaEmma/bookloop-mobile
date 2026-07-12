/**
 * Reader Profile — viewing another member.
 *
 * Warm gradient identity band (avatar + karma badge + name + plan + bio + message),
 * a compact exchange-stats bar, and their active listings shown as real book
 * jackets. Uses a custom header so the back button reads "Profile", not the raw
 * previous route name. Mirrors the own-profile tab's visual identity.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Settings,
  Crown,
  Star,
  MessageCircle,
  Leaf,
  ArrowLeftRight,
  ChevronRight,
} from 'lucide-react-native';
import { BookCover } from '@/components/ui/BookCover';
import { useAuth } from '@/contexts/AuthContext';
import { usersService, listingsService } from '@/services/api';
import { BookLoopColors, ConditionBadge } from '@/constants/theme';

const C = {
  bg: BookLoopColors.cream,
  text: BookLoopColors.deepEspresso,
  muted: BookLoopColors.authorText,
  active: BookLoopColors.coffeeBrown,
  gold: BookLoopColors.mutedGold,
  cardBorder: '#EFE2CE',
  body: '#6B5240',
};

const TIER = {
  free: { label: 'Free', Icon: Leaf },
  basic: { label: 'Basic', Icon: Star },
  premium: { label: 'Premium', Icon: Crown },
} as const;

const TYPE_LABEL: Record<string, string> = {
  exchange: 'Exchange',
  donate: 'Free',
  borrow: 'Borrow',
};

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  avatarUrl?: string;
  bio?: string;
  karma: number;
  subscriptionTier: 'free' | 'basic' | 'premium';
  stats: {
    totalExchanges: number;
    activeListings: number;
    completedExchanges: number;
    averageRating: number;
  };
  createdAt: string;
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isOwnProfile = currentUser?.id === id;

  useEffect(() => {
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const profileData: any = await usersService.getUserById(id);
      setProfile({
        ...profileData,
        stats: profileData.stats || {
          totalExchanges: 0,
          activeListings: 0,
          completedExchanges: 0,
          averageRating: 0,
        },
      });

      try {
        const userListings = await listingsService.getUserListings(id);
        setListings(userListings.slice(0, 4));
      } catch {
        setListings([]);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load profile');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={C.active} />
      </View>
    );
  }
  if (!profile) return null;

  const name = `${profile.firstName} ${profile.lastName}`.trim();
  const initials =
    ((profile.firstName?.charAt(0) || '') + (profile.lastName?.charAt(0) || '')).toUpperCase() || 'BL';
  const karma = profile.karma ?? 0;
  const tier = (profile.subscriptionTier || 'free') as keyof typeof TIER;
  const tierInfo = TIER[tier];
  const s = profile.stats;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg }]} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
      >
        {/* Identity band */}
        <LinearGradient
          colors={['#F4E1C1', '#D8B48A']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.band, { paddingTop: insets.top + 6 }]}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} accessibilityLabel="Back">
              <ChevronLeft size={20} color={C.text} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{isOwnProfile ? 'My profile' : 'Profile'}</Text>
            {isOwnProfile ? (
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/settings')} accessibilityLabel="Settings">
                <Settings size={18} color={C.text} strokeWidth={2} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 36 }} />
            )}
          </View>

          <View style={styles.identityRow}>
            <View style={styles.avatarWrap}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
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
              <Text style={styles.name} numberOfLines={2}>{name}</Text>
              <View style={styles.planPill}>
                <tierInfo.Icon size={12} color="#6B5240" strokeWidth={2} />
                <Text style={styles.planText}>{tierInfo.label} plan</Text>
              </View>
            </View>
          </View>

          {!!profile.bio && (
            <Text style={styles.bio} numberOfLines={4}>{profile.bio}</Text>
          )}

          {!isOwnProfile && (
            <TouchableOpacity
              style={styles.messageBtn}
              activeOpacity={0.9}
              onPress={() => Alert.alert('Coming soon', 'Messaging is on the way.')}
            >
              <MessageCircle size={17} color={BookLoopColors.cream} strokeWidth={2} />
              <Text style={styles.messageText}>Send message</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Exchange stats</Text>
          <View style={styles.statsCard}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{s.totalExchanges ?? 0}</Text>
              <Text style={styles.statLabel}>Exchanges</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{s.activeListings ?? 0}</Text>
              <Text style={styles.statLabel}>Listed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{s.completedExchanges ?? 0}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <View style={styles.ratingRow}>
                <Star size={13} color={C.gold} fill={C.gold} strokeWidth={1} />
                <Text style={styles.statValue}>{(s.averageRating ?? 0).toFixed(1)}</Text>
              </View>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>

          {listings.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Active listings</Text>
              {listings.map((listing) => {
                const cond =
                  ConditionBadge[listing.condition as keyof typeof ConditionBadge] ?? ConditionBadge.good;
                return (
                  <TouchableOpacity
                    key={listing.id}
                    style={styles.listingRow}
                    activeOpacity={0.85}
                    onPress={() =>
                      router.push({ pathname: '/listing/[id]', params: { id: listing.id } })
                    }
                  >
                    <View style={styles.listingCover}>
                      <BookCover
                        title={listing.book.title}
                        author={listing.book.author}
                        coverImage={listing.book.coverImage}
                        size="sm"
                        fill
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listingTitle} numberOfLines={1}>{listing.book.title}</Text>
                      <Text style={styles.listingAuthor} numberOfLines={1}>{listing.book.author}</Text>
                      <View style={styles.listingMeta}>
                        <View style={[styles.condChip, { backgroundColor: cond.light.bg }]}>
                          <Text style={[styles.condText, { color: cond.light.fg }]}>{cond.label}</Text>
                        </View>
                        <View style={styles.typeChip}>
                          <ArrowLeftRight size={11} color={C.active} strokeWidth={2} />
                          <Text style={styles.typeText}>{TYPE_LABEL[listing.listingType] ?? listing.listingType}</Text>
                        </View>
                      </View>
                    </View>
                    <ChevronRight size={18} color="#B39C82" strokeWidth={2} />
                  </TouchableOpacity>
                );
              })}
            </>
          ) : (
            <View style={styles.emptyListings}>
              <Text style={styles.emptyText}>
                {isOwnProfile ? "You haven't listed any books yet." : `${profile.firstName} has no active listings.`}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: 'center', alignItems: 'center' },

  band: { paddingHorizontal: 18, paddingBottom: 20 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,248,240,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 16, fontWeight: '600', color: C.text },

  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 14 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 82, height: 82, borderRadius: 41, borderWidth: 3, borderColor: BookLoopColors.cream },
  avatarFallback: { backgroundColor: C.active, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Poppins-Bold', fontSize: 27, color: BookLoopColors.cream },
  karmaBadgeWrap: { position: 'absolute', bottom: -7, left: 0, right: 0, alignItems: 'center' },
  karmaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: BookLoopColors.mutedGold,
    borderWidth: 2,
    borderColor: BookLoopColors.cream,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  karmaBadgeText: { fontFamily: 'Inter-Bold', fontSize: 11, fontWeight: '700', color: '#5A3E1E' },
  nameCol: { flex: 1, gap: 8 },
  name: { fontFamily: 'Poppins-Bold', fontSize: 21, color: C.text, lineHeight: 26 },
  planPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,248,240,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  planText: { fontFamily: 'Inter-SemiBold', fontSize: 11, fontWeight: '600', color: '#6B5240' },
  bio: {
    fontFamily: 'LibreBaskerville-Italic',
    fontSize: 13,
    color: '#4A3528',
    lineHeight: 20,
    marginTop: 16,
  },
  messageBtn: {
    marginTop: 16,
    height: 46,
    borderRadius: 12,
    backgroundColor: C.active,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  messageText: { fontFamily: 'Inter-SemiBold', fontSize: 15, fontWeight: '600', color: BookLoopColors.cream },

  body: { paddingHorizontal: 18, paddingTop: 20 },
  sectionTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 12 },

  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 16,
    paddingVertical: 16,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: 'Poppins-Bold', fontSize: 19, fontWeight: '700', color: C.text },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: 10.5, color: C.muted, marginTop: 3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statDivider: { width: 1, height: 30, backgroundColor: C.cardBorder },

  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },
  listingCover: {
    width: 52,
    height: 74,
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: '#EADFCB',
  },
  listingTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 14, fontWeight: '600', color: C.text },
  listingAuthor: { fontFamily: 'Inter-Regular', fontSize: 12, color: C.muted, marginTop: 1 },
  listingMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7 },
  condChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  condText: { fontFamily: 'Inter-SemiBold', fontSize: 10.5, fontWeight: '600' },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  typeText: { fontFamily: 'Inter-Medium', fontSize: 11, color: C.active, fontWeight: '500' },

  emptyListings: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 26,
    alignItems: 'center',
  },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 13, color: C.muted },
});
