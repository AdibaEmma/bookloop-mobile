/**
 * Exchanges Tab — design refresh 10a
 *
 * Active / Pending / Completed segmented pills over a list of exchange cards,
 * each with the Requested → Accepted → Meeting set → Done status stepper and a
 * context-aware primary action. Friendly empty state (10e) when a bucket is empty.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Check, MessageSquare, QrCode, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { EmptyState } from '@/components/ui';
import { BookCover } from '@/components/ui/BookCover';
import { exchangesService } from '@/services/api';
import type { Exchange } from '@/services/api/exchanges.service';
import { useAuth } from '@/contexts/AuthContext';
import { BookLoopColors } from '@/constants/theme';

type Bucket = 'active' | 'pending' | 'completed';
const STEPS = ['Requested', 'Accepted', 'Meeting set', 'Done'];

const C = {
  grad: [BookLoopColors.creamTop, BookLoopColors.cream] as const,
  text: BookLoopColors.deepEspresso,
  muted: BookLoopColors.authorText,
  active: BookLoopColors.coffeeBrown,
  gold: BookLoopColors.mutedGold,
  goldDeep: BookLoopColors.goldDeep,
  idle: '#F0E7D6',
  idleBorder: '#E4DAC8',
  cardBorder: '#EFE2CE',
};

function timeAgo(iso?: string): string {
  if (!iso) return 'recently';
  const t = new Date(iso).getTime();
  if (isNaN(t)) return 'recently';
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function bucketOf(status: string): Bucket {
  if (status === 'completed') return 'completed';
  if (status === 'accepted') return 'active';
  return 'pending'; // pending / declined / cancelled surface under Pending
}

function stepOf(ex: Exchange): number {
  if (ex.status === 'completed') return 3;
  if (ex.status === 'accepted') return ex.meetupSpotId || ex.meetupSpotName ? 2 : 1;
  return 0; // pending → Requested
}

export default function ExchangesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<Bucket>('active');
  const [all, setAll] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const list = await exchangesService.getMyRequests();
      setAll(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Failed to load exchanges:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const counts = {
    active: all.filter((e) => bucketOf(e.status) === 'active').length,
    pending: all.filter((e) => bucketOf(e.status) === 'pending').length,
    completed: all.filter((e) => bucketOf(e.status) === 'completed').length,
  };
  const items = all.filter((e) => bucketOf(e.status) === tab);

  const partnerOf = (ex: Exchange) => {
    const iAmOwner = ex.ownerId === user?.id;
    const p = iAmOwner ? ex.requester : ex.owner;
    return `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim() || 'a reader';
  };

  const handleCancel = (ex: any) => {
    Alert.alert(
      'Cancel request',
      `Cancel your request for "${ex.listing?.book?.title ?? 'this book'}"?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel request',
          style: 'destructive',
          onPress: async () => {
            try {
              await exchangesService.cancelExchange(ex.id);
              load(true);
            } catch {
              Alert.alert('Error', 'Could not cancel. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderCard = (ex: any) => {
    const title = ex.listing?.book?.title || 'Book';
    const partner = partnerOf(ex);
    const step = stepOf(ex);
    const isPending = ex.status === 'pending';
    const partnerInitial = partner.charAt(0).toUpperCase() || '?';
    const meetupText =
      ex.meetupSpotName && ex.meetupTime
        ? `${ex.meetupSpotName} · ${new Date(ex.meetupTime).toLocaleString(undefined, {
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit',
          })}`
        : ex.meetupSpotName || null;

    return (
      <View key={ex.id} style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cover}>
            <BookCover
              title={title}
              author={ex.listing?.book?.author}
              coverImage={ex.listing?.book?.coverImage}
              size="sm"
              fill
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
            <View style={styles.withRow}>
              <View style={styles.partnerAvatar}>
                <Text style={styles.partnerInitial}>{partnerInitial}</Text>
              </View>
              <Text style={styles.cardWith} numberOfLines={1}>with {partner}</Text>
            </View>
            {isPending ? (
              <View style={styles.waitingPill}>
                <View style={styles.waitingDot} />
                <Text style={styles.waitingText}>Waiting for their reply</Text>
              </View>
            ) : step === 2 && meetupText ? (
              <View style={styles.meetRow}>
                <MapPin size={13} color={C.active} strokeWidth={2} />
                <Text style={styles.meetText} numberOfLines={1}>{meetupText}</Text>
              </View>
            ) : step === 1 ? (
              <View style={styles.acceptedBadge}>
                <Text style={styles.acceptedText}>Accepted — pick a meetup</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Stepper — each cell draws its own half-tracks so the line runs
            continuously dot-to-dot and labels stay centered under their dots. */}
        <View style={styles.stepper}>
          {STEPS.map((label, i) => {
            const done = i < step;
            const current = i === step;
            const first = i === 0;
            const last = i === STEPS.length - 1;
            return (
              <View key={label} style={styles.stepCell}>
                <View style={styles.dotRow}>
                  <View
                    style={[
                      styles.track,
                      { backgroundColor: i <= step ? C.active : C.idleBorder },
                      first && styles.trackHidden,
                    ]}
                  />
                  <View
                    style={[
                      styles.dot,
                      done && { backgroundColor: C.active },
                      current && styles.dotCurrent,
                      !done && !current && styles.dotIdle,
                    ]}
                  >
                    {done && <Check size={11} color="#fff" strokeWidth={3} />}
                  </View>
                  <View
                    style={[
                      styles.track,
                      { backgroundColor: i < step ? C.active : C.idleBorder },
                      last && styles.trackHidden,
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    {
                      color: done ? C.text : current ? C.active : '#B39C82',
                      fontWeight: current ? '700' : '600',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Pending — waiting on them */}
        {isPending && (
          <>
            <View style={styles.pendingMeta}>
              <Clock size={14} color={C.muted} strokeWidth={2} />
              <Text style={styles.pendingMetaText}>
                Requested {timeAgo(ex.createdAt)} · usually replies within a day
              </Text>
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.primaryAction}
                activeOpacity={0.85}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: '/exchange/[id]', params: { id: ex.id } });
                }}
              >
                <MessageSquare size={15} color="#fff" strokeWidth={2} />
                <Text style={styles.primaryActionText}>Send a nudge</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelAction}
                activeOpacity={0.8}
                onPress={() => handleCancel(ex)}
              >
                <Text style={styles.cancelActionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Actions */}
        {step === 2 && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.primaryAction}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: '/exchange/qr-handover', params: { exchangeId: ex.id } });
              }}
            >
              <QrCode size={15} color="#fff" strokeWidth={2} />
              <Text style={styles.primaryActionText}>Confirm handover</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconAction}
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/exchange/[id]', params: { id: ex.id } })}
            >
              <MessageSquare size={17} color={C.active} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}
        {step === 1 && (
          <TouchableOpacity
            style={styles.goldAction}
            activeOpacity={0.85}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: '/exchange/meetup-selector', params: { exchangeId: ex.id } });
            }}
          >
            <MapPin size={15} color={C.text} strokeWidth={2} />
            <Text style={styles.goldActionText}>Choose safe meetup</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const emptyCopy: Record<Bucket, { title: string; body: string }> = {
    active: {
      title: 'No active swaps yet',
      body: 'Find a book you love nearby and send your first exchange request — it only takes a minute.',
    },
    pending: { title: 'No pending requests', body: 'Requests waiting on a reply will show up here.' },
    completed: { title: 'No completed swaps yet', body: 'Your finished exchanges will be collected here.' },
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={C.grad} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Exchanges</Text>
        </View>

        <View style={styles.segment}>
          {(['active', 'pending', 'completed'] as Bucket[]).map((b) => {
            const on = tab === b;
            const label = b.charAt(0).toUpperCase() + b.slice(1);
            return (
              <TouchableOpacity
                key={b}
                style={[styles.segItem, on && styles.segItemActive]}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.selectionAsync();
                  setTab(b);
                }}
              >
                <Text style={[styles.segText, { color: on ? '#fff' : C.muted }]}>{label}</Text>
                {counts[b] > 0 && (
                  <View style={[styles.segBadge, on && styles.segBadgeActive]}>
                    <Text style={[styles.segBadgeText, { color: on ? '#fff' : C.active }]}>
                      {counts[b]}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.centerFill}>
            <ActivityIndicator size="large" color={C.active} />
          </View>
        ) : items.length === 0 ? (
          <EmptyState
            title={emptyCopy[tab].title}
            body={emptyCopy[tab].body}
            actionLabel="Browse books"
            onAction={() => router.push('/(tabs)/explore')}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.active} />
            }
          >
            {items.map(renderCard)}
            {tab === 'pending' && (
              <Text style={styles.expiryNote}>
                Requests expire after 7 days if there&apos;s no reply. We&apos;ll notify you the
                moment they respond.
              </Text>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10 },
  headerTitle: { fontFamily: 'Poppins-Bold', fontSize: 22, color: C.text },
  segment: {
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: 18,
    marginBottom: 14,
    padding: 4,
    backgroundColor: '#F1E7D6',
    borderRadius: 12,
  },
  segItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 9,
  },
  segItemActive: { backgroundColor: C.active },
  segText: { fontFamily: 'Inter-SemiBold', fontSize: 12.5, fontWeight: '600' },
  segBadge: {
    paddingHorizontal: 6,
    minWidth: 16,
    alignItems: 'center',
    borderRadius: 9,
    backgroundColor: 'rgba(139,94,60,0.12)',
  },
  segBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  segBadgeText: { fontFamily: 'Inter-Bold', fontSize: 9.5, fontWeight: '700' },
  list: { paddingHorizontal: 14, paddingBottom: 24, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardTop: { flexDirection: 'row', gap: 12, padding: 14 },
  cover: { width: 52, height: 74, borderRadius: 8, overflow: 'hidden' },
  cardTitle: { fontFamily: 'Inter-Bold', fontSize: 14, color: C.text, fontWeight: '700' },
  withRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  partnerAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#D4B896',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerInitial: { fontFamily: 'Inter-Bold', fontSize: 8, fontWeight: '700', color: C.text },
  cardWith: { fontFamily: 'Inter-Regular', fontSize: 11.5, color: C.muted, flexShrink: 1 },
  waitingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(255,152,0,0.14)',
  },
  waitingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF9800' },
  waitingText: { fontFamily: 'Inter-SemiBold', fontSize: 10.5, fontWeight: '600', color: '#B07D22' },
  pendingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 10,
  },
  pendingMetaText: { fontFamily: 'Inter-Regular', fontSize: 11, color: C.muted, flex: 1, lineHeight: 15 },
  cancelAction: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0B7B0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelActionText: { fontFamily: 'Inter-SemiBold', fontSize: 12.5, fontWeight: '600', color: '#C6362B' },
  expiryNote: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 30,
    paddingTop: 4,
  },
  meetRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  meetText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: C.active, fontWeight: '600', flex: 1 },
  acceptedBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: 'rgba(76,175,80,0.14)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  acceptedText: { fontFamily: 'Inter-SemiBold', fontSize: 10, color: '#3B7A3F', fontWeight: '600' },
  stepper: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
  },
  stepCell: { flex: 1, alignItems: 'center', gap: 5 },
  dotRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  track: { flex: 1, height: 2, borderRadius: 1 },
  trackHidden: { opacity: 0 },
  dot: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  dotCurrent: {
    backgroundColor: BookLoopColors.mutedGold,
    borderWidth: 2,
    borderColor: BookLoopColors.coffeeBrown,
  },
  dotIdle: { backgroundColor: C.idle, borderWidth: 2, borderColor: C.idleBorder },
  stepLabel: { fontFamily: 'Inter-SemiBold', fontSize: 9.5, textAlign: 'center' },
  actionsRow: { flexDirection: 'row', gap: 9, paddingHorizontal: 14, paddingBottom: 14 },
  primaryAction: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.active,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryActionText: { fontFamily: 'Inter-SemiBold', fontSize: 12.5, color: '#fff', fontWeight: '600' },
  iconAction: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4C9B6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goldAction: {
    height: 44,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 12,
    backgroundColor: BookLoopColors.mutedGold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  goldActionText: { fontFamily: 'Inter-SemiBold', fontSize: 12.5, color: C.text, fontWeight: '600' },
});
