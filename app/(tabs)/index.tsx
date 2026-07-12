/**
 * Home Screen (Feed)
 *
 * Greeting + slim glass stats strip (Karma / Nearby / Swaps) + glass search
 * pill + "Fresh near you" shelf + "Swaps in motion" (your in-flight
 * exchanges, the actionable pulse of the app). Full-catalogue browsing lives
 * in Explore — Home deliberately doesn't duplicate it.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, BookPlus, ArrowRight, ChevronRight } from 'lucide-react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { StatsStrip, EmptyState } from '@/components/ui';
import { BookCover } from '@/components/ui/BookCover';
import type { StatItem } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { listingsService, exchangesService, Listing } from '@/services/api';
import type { Exchange } from '@/services/api/exchanges.service';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { showError } from '@/utils/errorHandler';
import { BookLoopColors } from '@/constants/theme';

const fmtDist = (m?: number) =>
  m === undefined ? '' : m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const scheme = useColorScheme() ?? 'light';
  const isDark = scheme === 'dark';

  const [nearbyListings, setNearbyListings] = useState<Listing[]>([]);
  const [popularListings, setPopularListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [swaps, setSwaps] = useState<Exchange[]>([]);
  const [myListingCount, setMyListingCount] = useState<number | null>(null);

  const fadeAnim = useState(new Animated.Value(0))[0];
  const scrollY = useState(new Animated.Value(0))[0];
  // The greeting recedes as the feed scrolls up, settling the header.
  const greetingOpacity = scrollY.interpolate({
    inputRange: [0, 56],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const c = isDark
    ? {
        grad: [BookLoopColors.darkBg, BookLoopColors.darkBgDeep] as const,
        text: BookLoopColors.darkText,
        muted: BookLoopColors.darkTextMuted,
        avatar: BookLoopColors.burntOrange,
        bellBg: BookLoopColors.darkSurfaceRaised,
        bellBorder: BookLoopColors.darkBorderSoft,
        bellIcon: '#E4D4C0',
        searchBg: BookLoopColors.darkSurfaceRaised,
        searchBorder: BookLoopColors.darkBorderSoft,
        searchIcon: BookLoopColors.burntOrange,
        searchText: '#8C7660',
        cardBg: 'rgba(61,46,36,0.55)',
        chipBg: 'rgba(217,121,65,0.16)',
        fade: BookLoopColors.darkBgDeep,
      }
    : {
        grad: [BookLoopColors.creamTop, BookLoopColors.cream] as const,
        text: BookLoopColors.deepEspresso,
        muted: BookLoopColors.mutedText,
        avatar: BookLoopColors.coffeeBrown,
        bellBg: 'rgba(244,225,193,0.7)',
        bellBorder: 'rgba(139,94,60,0.15)',
        bellIcon: BookLoopColors.deepEspresso,
        searchBg: 'rgba(255,255,255,0.65)',
        searchBorder: 'rgba(139,94,60,0.14)',
        searchIcon: BookLoopColors.coffeeBrown,
        searchText: BookLoopColors.mutedText,
        cardBg: 'rgba(255,255,255,0.65)',
        chipBg: 'rgba(139,94,60,0.12)',
        fade: BookLoopColors.cream,
      };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const pos = await Location.getCurrentPositionAsync({});
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch (error) {
      console.error('Location error:', error);
      return null;
    }
  };

  const loadHomeData = async (refresh = false) => {
    try {
      refresh ? setIsRefreshing(true) : setIsLoading(true);

      let currentLocation = location;
      if (!currentLocation) {
        currentLocation = await getLocation();
        setLocation(currentLocation);
      }

      const [popular, nearby, myExchanges, mine] = await Promise.allSettled([
        listingsService.searchListings({ limit: 20 }),
        currentLocation
          ? listingsService.searchListings({
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              radiusMeters: 5000,
              limit: 20,
            })
          : Promise.resolve({ data: [] }),
        exchangesService.getMyRequests(),
        listingsService.getMyListings(),
      ]);

      if (popular.status === 'fulfilled') {
        const data = (popular.value as any).data || popular.value || [];
        const list = (Array.isArray(data) ? data : []).filter((l: Listing) => l.userId !== user?.id);
        setPopularListings(list.slice(0, 20));
      }
      if (nearby.status === 'fulfilled') {
        const data = (nearby.value as any).data || nearby.value || [];
        const list = (Array.isArray(data) ? data : []).filter((l: Listing) => l.userId !== user?.id);
        setNearbyListings(list);
      }
      if (myExchanges.status === 'fulfilled') {
        const list = Array.isArray(myExchanges.value) ? myExchanges.value : [];
        // In-flight swaps only, the ones that may need a next step from you.
        // Accepted first (actionable), then newest.
        const inFlight = list
          .filter((e: Exchange) => e.status === 'pending' || e.status === 'accepted')
          .sort((a: Exchange, b: Exchange) => {
            if (a.status !== b.status) return a.status === 'accepted' ? -1 : 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
        setSwaps(inFlight.slice(0, 3));
      }
      if (mine.status === 'fulfilled') {
        setMyListingCount(Array.isArray(mine.value) ? mine.value.length : 0);
      }
    } catch (error: any) {
      console.error('Failed to load home data:', error);
      showError(error, 'Failed to Load Feed');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadHomeData();
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [user]);

  const handleRefresh = useCallback(() => loadHomeData(true), [location]);

  const openListing = (l: Listing) =>
    router.push({ pathname: '/listing/[id]', params: { id: l.id } });

  // Merge nearby + popular, dedupe — the shelf shows the best of it, and
  // Explore owns full browsing.
  const feed = useMemo(() => {
    const byId = new Map<string, Listing>();
    [...nearbyListings, ...popularListings].forEach((l) => byId.set(l.id, l));
    return Array.from(byId.values());
  }, [nearbyListings, popularListings]);

  const fresh = useMemo(() => feed.slice(0, 12), [feed]);

  const partnerOf = (ex: Exchange) => {
    const p = ex.ownerId === user?.id ? ex.requester : ex.owner;
    return `${p?.firstName ?? ''}`.trim() || 'a reader';
  };

  // One actionable line per swap — what happens next, from your side.
  const swapStatusOf = (ex: Exchange): { label: string; color: string } => {
    if (ex.status === 'pending') {
      return ex.ownerId === user?.id
        ? { label: `Reply to ${partnerOf(ex)}'s request`, color: BookLoopColors.burntOrange }
        : { label: `Waiting for ${partnerOf(ex)}`, color: '#B07D22' };
    }
    if (ex.meetupTime) {
      const when = new Date(ex.meetupTime).toLocaleString(undefined, {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
      });
      return { label: `Meetup ${when}`, color: BookLoopColors.coffeeBrown };
    }
    return { label: 'Accepted — pick a meetup', color: BookLoopColors.success };
  };

  const stats: StatItem[] = [
    { value: user?.karma ?? 0, label: 'Karma', icon: 'karma', onPress: () => router.push('/(tabs)/profile') },
    { value: nearbyListings.length, label: 'Nearby', icon: 'nearby', onPress: () => router.push('/(tabs)/explore') },
    {
      value: (user as any)?.exchangesCompleted ?? 0,
      label: 'Swaps',
      icon: 'swaps',
      onPress: () => router.push('/(tabs)/exchanges'),
    },
  ];

  // Brand-new reader: nothing listed, no karma, no swaps → show a first-action
  // nudge instead of an all-zero strip. Listings are the real signal — karma
  // alone misfired for users who had listed but not yet swapped.
  const isNewUser =
    myListingCount === 0 &&
    (user?.karma ?? 0) === 0 &&
    (((user as any)?.exchangesCompleted ?? 0) === 0);

  const firstName = user?.firstName || 'Reader';
  const initials =
    ((user?.firstName?.charAt(0) || '') + (user?.lastName?.charAt(0) || '')).toUpperCase() || 'BL';

  return (
    <View style={styles.container}>
      <LinearGradient colors={c.grad} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerLeft}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/profile');
            }}
          >
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: c.avatar }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View>
              <Animated.Text style={[styles.greeting, { color: c.muted, opacity: greetingOpacity }]}>
                Akwaaba, {firstName}
              </Animated.Text>
              <Text style={[styles.headline, { color: c.text }]}>Find your next read</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bell, { backgroundColor: c.bellBg, borderColor: c.bellBorder }]}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/notifications');
            }}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Bell size={20} color={c.bellIcon} strokeWidth={1.8} />
            {unreadCount > 0 && (
              <View style={[styles.bellDot, { borderColor: c.grad[0] }]} />
            )}
          </TouchableOpacity>
        </View>

        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <Animated.ScrollView
            style={styles.feed}
            contentContainerStyle={styles.feedInner}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={BookLoopColors.coffeeBrown}
              />
            }
          >
            {/* 0 · stats — or a first-book nudge for brand-new readers */}
            <View style={styles.topPad}>
              {isNewUser ? (
                <TouchableOpacity
                  style={[styles.nudge, { borderColor: c.searchBorder, backgroundColor: c.cardBg }]}
                  activeOpacity={0.9}
                  onPress={() => router.push('/listing/create')}
                >
                  <View style={[styles.nudgeIcon, { backgroundColor: c.chipBg }]}>
                    <BookPlus size={22} color={BookLoopColors.coffeeBrown} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.nudgeTitle, { color: c.text }]}>List your first book</Text>
                    <Text style={[styles.nudgeBody, { color: c.muted }]}>
                      Start your loop — earn Karma and meet readers nearby.
                    </Text>
                  </View>
                  <ArrowRight size={18} color={BookLoopColors.coffeeBrown} strokeWidth={2.2} />
                </TouchableOpacity>
              ) : (
                <StatsStrip stats={stats} />
              )}
            </View>

            {/* 2 · feed body */}
            <View style={styles.feedBody}>
            {isLoading ? (
              <Text style={[styles.loading, { color: c.muted }]}>Loading your feed…</Text>
            ) : feed.length > 0 ? (
              <>
                {/* Fresh near you — the shelf */}
                {fresh.length > 0 && (
                  <View style={styles.shelf}>
                    <View style={styles.sectionHead}>
                      <Text style={[styles.sectionTitle, { color: c.text }]}>Fresh near you</Text>
                      <Text style={[styles.sectionHint, { color: c.muted }]}>swipe →</Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.shelfRow}
                    >
                      {fresh.map((l) => (
                        <TouchableOpacity
                          key={`fresh-${l.id}`}
                          style={styles.shelfItem}
                          activeOpacity={0.85}
                          onPress={() => openListing(l)}
                        >
                          <BookCover
                            title={l.book.title}
                            author={l.book.author}
                            coverImage={l.book.coverImage}
                            size="lg"
                          />
                          <Text style={[styles.shelfTitle, { color: c.text }]} numberOfLines={1}>
                            {l.book.title}
                          </Text>
                          <Text style={[styles.shelfMeta, { color: c.muted }]} numberOfLines={1}>
                            {l.distance !== undefined ? `${fmtDist(l.distance)} · ` : ''}
                            {l.user?.firstName ?? 'Reader'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Hand browsing off to Explore instead of duplicating it here */}
                <TouchableOpacity
                  style={[styles.exploreLink, { borderColor: c.searchBorder, backgroundColor: c.cardBg }]}
                  activeOpacity={0.8}
                  onPress={() => router.push('/(tabs)/explore')}
                >
                  <Text style={[styles.exploreLinkText, { color: c.text }]}>
                    Browse all books in Explore
                  </Text>
                  <ArrowRight size={16} color={BookLoopColors.coffeeBrown} strokeWidth={2.2} />
                </TouchableOpacity>

                {/* Swaps in motion — the personal pulse of the app */}
                {swaps.length > 0 && (
                  <View style={styles.swapsSection}>
                    <View style={styles.sectionHead}>
                      <Text style={[styles.sectionTitle, { color: c.text }]}>Swaps in motion</Text>
                      <TouchableOpacity
                        onPress={() => router.push('/(tabs)/exchanges')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.seeAll}>See all</Text>
                      </TouchableOpacity>
                    </View>

                    {swaps.map((ex) => {
                      const status = swapStatusOf(ex);
                      return (
                        <TouchableOpacity
                          key={ex.id}
                          style={[styles.swapRow, { borderColor: c.searchBorder, backgroundColor: c.cardBg }]}
                          activeOpacity={0.85}
                          onPress={() =>
                            router.push({ pathname: '/exchange/[id]', params: { id: ex.id } })
                          }
                        >
                          <View style={styles.swapCover}>
                            <BookCover
                              title={ex.listing?.book?.title ?? 'Book'}
                              author={ex.listing?.book?.author}
                              coverImage={ex.listing?.book?.coverImage}
                              size="sm"
                              fill
                            />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.swapTitle, { color: c.text }]} numberOfLines={1}>
                              {ex.listing?.book?.title ?? 'Book'}
                            </Text>
                            <Text
                              style={[styles.swapStatus, { color: status.color }]}
                              numberOfLines={1}
                            >
                              {status.label}
                            </Text>
                          </View>
                          <ChevronRight size={17} color={c.muted} strokeWidth={2} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            ) : (
              <EmptyState
                title="No books nearby"
                body="Be the first to list a book in your neighbourhood — someone nearby is waiting for a good read."
                actionLabel="List a book"
                actionIcon={BookPlus}
                onAction={() => router.push('/listing/create')}
              />
            )}
            </View>
          </Animated.ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    fontWeight: '700',
    color: BookLoopColors.cream,
  },
  greeting: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    fontWeight: '500',
  },
  headline: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginTop: 1,
  },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BookLoopColors.error,
    borderWidth: 1.5,
  },
  hpad: {
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 7,
    elevation: 1,
  },
  searchText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    fontWeight: '500',
  },
  chipsWrap: {
    paddingBottom: 12,
  },
  feed: {
    flex: 1,
  },
  feedInner: {
    paddingTop: 4,
    paddingBottom: 24,
  },
  topPad: {
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  feedBody: {
    // Match the 18pt gutter used by the header/stats/search above.
    paddingHorizontal: 18,
    paddingTop: 2,
    gap: 12,
  },
  nudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#8B5E3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 2,
  },
  nudgeIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14.5,
    fontWeight: '600',
  },
  nudgeBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  shelf: {
    marginBottom: 2,
  },
  exploreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 46,
    borderWidth: 1,
    borderRadius: 13,
  },
  exploreLinkText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13.5,
    fontWeight: '600',
  },
  swapsSection: {
    marginTop: 6,
  },
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 14,
  },
  swapCover: {
    width: 38,
    height: 54,
    borderRadius: 6,
    overflow: 'hidden',
  },
  swapTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13.5,
    fontWeight: '600',
  },
  swapStatus: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 3,
  },
  seeAll: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
    fontWeight: '600',
    color: BookLoopColors.coffeeBrown,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sectionHint: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    fontWeight: '500',
  },
  shelfRow: {
    gap: 14,
    paddingRight: 8,
    paddingBottom: 2,
  },
  shelfItem: {
    width: 132,
  },
  shelfTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 9,
  },
  shelfMeta: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 2,
  },
  loading: {
    textAlign: 'center',
    marginTop: 40,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    marginTop: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});
