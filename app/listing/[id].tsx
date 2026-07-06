/**
 * Listing Detail — design refresh 10b
 *
 * Image gallery (cover/photos with spine fallback) + back / share / save,
 * title + author·year + condition badge, distance + type meta, a "Looking for
 * in return" card, an owner card, an "About this copy" section, and a sticky
 * request bar. Owner sees edit + publish/unpublish instead of request.
 *
 * All prior behaviour (save, share, request, owner publish/hide, description
 * expand) is preserved; only the presentation was reworked. Also fixes the
 * pre-existing FlatList photo-typing error by narrowing the photos array.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
  Share,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ArrowLeft,
  Share2,
  Heart,
  Pencil,
  MapPin,
  ArrowLeftRight,
  ShieldCheck,
  Star,
  ChevronRight,
  Eye,
  EyeOff,
  Globe,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { BookCover } from '@/components/ui/BookCover';
import { listingsService, Listing } from '@/services/api';
import { BookLoopColors, ConditionBadge } from '@/constants/theme';

const { width } = Dimensions.get('window');
const GALLERY_H = 344;

const C = {
  bg: BookLoopColors.cream,
  text: BookLoopColors.deepEspresso,
  muted: BookLoopColors.authorText,
  active: BookLoopColors.coffeeBrown,
  gold: BookLoopColors.mutedGold,
  cardBorder: '#EFE2CE',
  body: '#6B5240',
  parchment: BookLoopColors.parchmentBeige,
  spine: '#C9A97E',
};

const TYPE_LABEL: Record<string, string> = {
  exchange: 'For exchange',
  donate: 'Free to a good home',
  borrow: 'For borrow',
};

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listingsService.getListingById(id);
      setListing(data);
    } catch (error) {
      console.error('Failed to load listing:', error);
      Alert.alert('Error', 'Failed to load listing details');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onGalleryScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const share = async () => {
    if (!listing) return;
    try {
      await Share.share({
        message: `Check out "${listing.book.title}" by ${listing.book.author} on BookLoop!`,
        url: `bookloop://listing/${listing.id}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const request = () => {
    if (!listing) return;
    if (listing.userId === user?.id) {
      Alert.alert('Your listing', 'You cannot request your own listing');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/exchange/request', params: { listingId: listing.id } });
  };

  const setStatus = async (status: 'available' | 'draft') => {
    if (!listing) return;
    try {
      await listingsService.updateListing(listing.id, { status });
      load();
    } catch {
      Alert.alert('Error', 'Failed to update listing');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={C.active} />
      </View>
    );
  }
  if (!listing) return null;

  // Real user photos of this copy. The cover itself is drawn by the hero via
  // BookCover, which shows the jacket when there's no cover (or it fails to load)
  // — so a coverless book no longer renders as a flat empty block.
  const userPhotos: string[] = (listing.photos ?? []).filter((p): p is string => Boolean(p));
  const hasPhotos = userPhotos.length > 0;

  const cond = ConditionBadge[listing.condition] ?? ConditionBadge.good;
  const isOwner = listing.userId === user?.id;
  const isAvailable = listing.status === 'available';
  const year = listing.book.publishedDate ? String(listing.book.publishedDate).slice(0, 4) : null;
  const prefs = listing.exchangePreferences ?? [];
  // Fall back to the book's synopsis when this copy has no note of its own, so the
  // page has substance instead of a large empty gap.
  const aboutText = listing.description || listing.book.description || '';
  const aboutTitle = listing.description ? 'About this copy' : 'About this book';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: 96 }}>
        {/* Gallery */}
        <View style={styles.gallery}>
          <LinearGradient
            colors={['#ECD9B6', '#D6B888']}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {hasPhotos ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onGalleryScroll}
            >
              {userPhotos.map((p, i) => (
                <Image key={i} source={{ uri: p }} style={styles.galleryImg} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : (
            // Coverless (or broken-cover) book — present it as a real book resting
            // on a warm surface, not a flat empty rectangle.
            <View style={styles.heroWrap}>
              <BookCover
                title={listing.book.title}
                author={listing.book.author}
                coverImage={listing.book.coverImage}
                size="lg"
              />
              <View style={styles.heroGround} />
            </View>
          )}

          <SafeAreaView style={styles.galleryOverlay} pointerEvents="box-none">
            <View style={styles.galleryTop} pointerEvents="box-none">
              <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()} accessibilityLabel="Back">
                <ArrowLeft size={19} color={C.text} strokeWidth={2} />
              </TouchableOpacity>
              <View style={styles.galleryTopRight}>
                <TouchableOpacity style={styles.circleBtn} onPress={share} accessibilityLabel="Share">
                  <Share2 size={18} color={C.text} strokeWidth={2} />
                </TouchableOpacity>
                {isOwner ? (
                  <TouchableOpacity
                    style={styles.circleBtn}
                    onPress={() => router.push(`/listing/edit/${listing.id}`)}
                    accessibilityLabel="Edit listing"
                  >
                    <Pencil size={18} color={C.text} strokeWidth={2} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.circleBtn}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSaved((s) => !s);
                    }}
                    accessibilityLabel={saved ? 'Unsave' : 'Save'}
                  >
                    <Heart
                      size={18}
                      color={saved ? BookLoopColors.error : C.text}
                      fill={saved ? BookLoopColors.error : 'transparent'}
                      strokeWidth={2}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </SafeAreaView>

          {hasPhotos && userPhotos.length > 1 && (
            <View style={styles.dots}>
              {userPhotos.map((_, i) => (
                <View key={i} style={[styles.dot, i === photoIndex ? styles.dotOn : styles.dotOff]} />
              ))}
            </View>
          )}
          {!isAvailable && (
            <View style={styles.statusRibbon}>
              <Text style={styles.statusRibbonText}>{listing.status.toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.title}>{listing.book.title}</Text>
              <Text style={styles.author}>
                {listing.book.author}{year ? ` · ${year}` : ''}
              </Text>
            </View>
            <View style={[styles.condBadge, { backgroundColor: cond.light.bg }]}>
              <Text style={[styles.condText, { color: cond.light.fg }]}>{cond.label}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            {listing.distance !== undefined && (
              <View style={styles.metaItem}>
                <MapPin size={14} color={C.active} strokeWidth={2} />
                <Text style={styles.metaText}>
                  {listing.distance < 1000
                    ? `${Math.round(listing.distance)}m away`
                    : `${(listing.distance / 1000).toFixed(1)}km away`}
                </Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <ArrowLeftRight size={14} color={C.active} strokeWidth={2} />
              <Text style={styles.metaText}>{TYPE_LABEL[listing.listingType] ?? listing.listingType}</Text>
            </View>
          </View>

          {/* Looking for in return */}
          {listing.listingType === 'exchange' && prefs.length > 0 && (
            <View style={styles.wantsCard}>
              <Text style={styles.wantsLabel}>Looking for in return</Text>
              <View style={styles.wantsChips}>
                {prefs.map((p) => (
                  <View key={p.id} style={styles.wantChip}>
                    <Text style={styles.wantChipText} numberOfLines={1}>{p.book.title}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Owner */}
          <TouchableOpacity
            style={styles.owner}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/profile/[id]', params: { id: listing.userId } })}
          >
            {listing.user.avatarUrl ? (
              <Image source={{ uri: listing.user.avatarUrl }} style={styles.ownerAvatar} />
            ) : (
              <View style={[styles.ownerAvatar, styles.ownerAvatarFallback]}>
                <Text style={styles.ownerInitials}>
                  {((listing.user.firstName?.charAt(0) || '') + (listing.user.lastName?.charAt(0) || '')).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.ownerNameRow}>
                <Text style={styles.ownerName}>
                  {listing.user.firstName} {listing.user.lastName}
                </Text>
                <ShieldCheck size={14} color={C.active} fill={C.gold} strokeWidth={1.4} />
              </View>
              <View style={styles.ownerMetaRow}>
                <Star size={12} color={C.gold} fill={C.gold} strokeWidth={1} />
                <Text style={styles.ownerMeta}>{listing.user.karma ?? 0} karma</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#B39C82" strokeWidth={2} />
          </TouchableOpacity>

          {/* About */}
          {!!aboutText && (
            <View style={styles.about}>
              <Text style={styles.aboutTitle}>{aboutTitle}</Text>
              <Text style={styles.aboutBody} numberOfLines={expanded ? undefined : 4}>
                {aboutText}
              </Text>
              {aboutText.length > 160 && (
                <TouchableOpacity onPress={() => setExpanded((e) => !e)}>
                  <Text style={styles.readMore}>{expanded ? 'Show less' : 'Read more'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Book facts */}
          {(!!year || !!listing.book.pageCount) && (
            <View style={styles.facts}>
              {!!year && (
                <View style={styles.factItem}>
                  <Text style={styles.factValue}>{year}</Text>
                  <Text style={styles.factLabel}>Published</Text>
                </View>
              )}
              {!!year && !!listing.book.pageCount && <View style={styles.factDivider} />}
              {!!listing.book.pageCount && (
                <View style={styles.factItem}>
                  <Text style={styles.factValue}>{listing.book.pageCount}</Text>
                  <Text style={styles.factLabel}>Pages</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky bottom */}
      <View style={styles.bottomBar}>
        {!isOwner && isAvailable && (
          <>
            <TouchableOpacity style={styles.iconBtn} onPress={share} accessibilityLabel="Share">
              <Share2 size={20} color={C.active} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={request}>
              <ArrowLeftRight size={18} color={BookLoopColors.cream} strokeWidth={2} />
              <Text style={styles.primaryText}>Request this book</Text>
            </TouchableOpacity>
          </>
        )}
        {!isOwner && !isAvailable && (
          <View style={[styles.primaryBtn, { backgroundColor: C.parchment }]}>
            <Text style={[styles.primaryText, { color: C.body }]}>Not available</Text>
          </View>
        )}
        {isOwner && listing.status === 'draft' && (
          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={() => setStatus('available')}>
            <Globe size={18} color={BookLoopColors.cream} strokeWidth={2} />
            <Text style={styles.primaryText}>Publish listing</Text>
          </TouchableOpacity>
        )}
        {isOwner && listing.status === 'available' && (
          <>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push(`/listing/edit/${listing.id}`)}>
              <Pencil size={20} color={C.active} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, styles.outlineBtn]}
              activeOpacity={0.85}
              onPress={() => setStatus('draft')}
            >
              <EyeOff size={18} color={C.active} strokeWidth={2} />
              <Text style={[styles.primaryText, { color: C.active }]}>Mark unavailable</Text>
            </TouchableOpacity>
          </>
        )}
        {isOwner && listing.status !== 'draft' && listing.status !== 'available' && (
          <TouchableOpacity style={[styles.primaryBtn, styles.outlineBtn]} onPress={() => setStatus('available')}>
            <Eye size={18} color={C.active} strokeWidth={2} />
            <Text style={[styles.primaryText, { color: C.active }]}>Relist</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  gallery: { height: GALLERY_H, position: 'relative', overflow: 'hidden' },
  galleryImg: { width, height: GALLERY_H },
  heroWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 34, // clear the top action buttons
  },
  heroGround: {
    marginTop: 14,
    width: 118,
    height: 13,
    borderRadius: 60,
    backgroundColor: 'rgba(74,53,40,0.16)',
  },
  galleryOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  galleryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  galleryTopRight: { flexDirection: 'row', gap: 8 },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,248,240,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: { height: 5, borderRadius: 3 },
  dotOn: { width: 18, backgroundColor: C.text },
  dotOff: { width: 5, backgroundColor: 'rgba(74,53,40,0.35)' },
  statusRibbon: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: 'rgba(74,53,40,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusRibbonText: { fontFamily: 'Inter-Bold', fontSize: 10, color: '#fff', letterSpacing: 0.5 },
  content: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    marginTop: -16,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontFamily: 'Poppins-Bold', fontSize: 20, color: C.text, lineHeight: 24 },
  author: { fontFamily: 'Inter-Regular', fontSize: 13, color: C.muted, marginTop: 3 },
  condBadge: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 9 },
  condText: { fontFamily: 'Inter-SemiBold', fontSize: 11, fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: 14, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: 'Inter-Regular', fontSize: 12, color: C.muted, fontWeight: '500' },
  wantsCard: { marginTop: 16, padding: 13, backgroundColor: C.parchment, borderRadius: 14 },
  wantsLabel: { fontFamily: 'Inter-SemiBold', fontSize: 11.5, color: C.body, marginBottom: 8, fontWeight: '600' },
  wantsChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  wantChip: { backgroundColor: '#fff', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, maxWidth: width - 80 },
  wantChipText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: C.active, fontWeight: '600' },
  owner: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 13,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 14,
  },
  ownerAvatar: { width: 44, height: 44, borderRadius: 22 },
  ownerAvatarFallback: { backgroundColor: C.spine, justifyContent: 'center', alignItems: 'center' },
  ownerInitials: { fontFamily: 'Inter-Bold', fontSize: 15, color: C.text },
  ownerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ownerName: { fontFamily: 'Inter-Bold', fontSize: 14, color: C.text, fontWeight: '700' },
  ownerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  ownerMeta: { fontFamily: 'Inter-Regular', fontSize: 11.5, color: C.muted },
  about: { marginTop: 16 },
  aboutTitle: { fontFamily: 'Inter-Bold', fontSize: 14, color: C.text, marginBottom: 6, fontWeight: '700' },
  aboutBody: { fontFamily: 'Inter-Regular', fontSize: 12.5, color: C.body, lineHeight: 20 },
  readMore: { fontFamily: 'Inter-SemiBold', fontSize: 12.5, color: C.active, marginTop: 4, fontWeight: '600' },
  facts: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 14,
    paddingVertical: 14,
  },
  factItem: { flex: 1, alignItems: 'center' },
  factValue: { fontFamily: 'Poppins-SemiBold', fontSize: 16, color: C.text, fontWeight: '600' },
  factLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: C.muted, marginTop: 2 },
  factDivider: { width: 1, alignSelf: 'stretch', backgroundColor: C.cardBorder, marginVertical: 2 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 26,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
  },
  iconBtn: {
    width: 52,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4C9B6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: C.active,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  outlineBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.active },
  primaryText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: BookLoopColors.cream, fontWeight: '600' },
});
