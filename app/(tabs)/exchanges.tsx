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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Check, MessageSquare, QrCode } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { EmptyState } from '@/components/ui';
import { BookCover } from '@/components/ui/BookCover';
import { exchangesService } from '@/services/api';
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

function bucketOf(status: string): Bucket {
  if (status === 'completed') return 'completed';
  if (status === 'accepted') return 'active';
  return 'pending'; // pending / declined / cancelled surface under Pending
}

function stepOf(ex: any): number {
  if (ex.status === 'completed') return 3;
  if (ex.status === 'accepted') return ex.meetup_spot_id || ex.meetup_spot_name ? 2 : 1;
  return 0; // pending → Requested
}

export default function ExchangesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<Bucket>('active');
  const [all, setAll] = useState<any[]>([]);
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

  const partnerOf = (ex: any) => {
    const iAmOwner = ex.owner_id === user?.id;
    const p = iAmOwner ? ex.requester : ex.owner;
    return `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || 'a reader';
  };

  const renderCard = (ex: any) => {
    const title = ex.listing?.book?.title || 'Book';
    const partner = partnerOf(ex);
    const step = stepOf(ex);
    const meetupText =
      ex.meetup_spot_name && ex.meetup_time
        ? `${ex.meetup_spot_name} · ${new Date(ex.meetup_time).toLocaleString(undefined, {
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit',
          })}`
        : ex.meetup_spot_name || null;

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
            <Text style={styles.cardWith}>with {partner}</Text>
            {step === 2 && meetupText ? (
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

        {/* Stepper */}
        <View style={styles.stepper}>
          {STEPS.map((label, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <React.Fragment key={label}>
                {i > 0 && (
                  <View
                    style={[
                      styles.stepLine,
                      { backgroundColor: i <= step ? C.active : C.idleBorder },
                    ]}
                  />
                )}
                <View style={styles.stepNode}>
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
              </React.Fragment>
            );
          })}
        </View>

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

        <View style={styles.pills}>
          {(['active', 'pending', 'completed'] as Bucket[]).map((b) => {
            const on = tab === b;
            const label = b.charAt(0).toUpperCase() + b.slice(1);
            return (
              <TouchableOpacity
                key={b}
                style={[styles.pill, on && { backgroundColor: C.active }]}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.selectionAsync();
                  setTab(b);
                }}
              >
                <Text style={[styles.pillText, { color: on ? '#fff' : C.muted }]}>
                  {label}
                  {counts[b] > 0 ? ` · ${counts[b]}` : ''}
                </Text>
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
  pills: { flexDirection: 'row', gap: 6, paddingHorizontal: 18, paddingBottom: 12 },
  pill: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  pillText: { fontFamily: 'Inter-SemiBold', fontSize: 12.5, fontWeight: '600' },
  list: { paddingHorizontal: 14, paddingBottom: 24, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardTop: { flexDirection: 'row', gap: 12, padding: 13 },
  cover: { width: 48, height: 68, borderRadius: 7, overflow: 'hidden' },
  cardTitle: { fontFamily: 'Inter-Bold', fontSize: 14, color: C.text, fontWeight: '700' },
  cardWith: { fontFamily: 'Inter-Regular', fontSize: 11.5, color: C.muted, marginTop: 2 },
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
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
  },
  stepNode: { flex: 1, alignItems: 'center', gap: 4 },
  stepLine: { height: 2, width: 16, marginTop: 9 },
  dot: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  dotCurrent: {
    backgroundColor: BookLoopColors.mutedGold,
    borderWidth: 2,
    borderColor: BookLoopColors.coffeeBrown,
  },
  dotIdle: { backgroundColor: C.idle, borderWidth: 2, borderColor: C.idleBorder },
  stepLabel: { fontFamily: 'Inter-SemiBold', fontSize: 8.5, textAlign: 'center' },
  actionsRow: { flexDirection: 'row', gap: 9, paddingHorizontal: 13, paddingBottom: 13 },
  primaryAction: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.active,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryActionText: { fontFamily: 'Inter-SemiBold', fontSize: 12.5, color: '#fff', fontWeight: '600' },
  iconAction: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D4C9B6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goldAction: {
    height: 40,
    marginHorizontal: 13,
    marginBottom: 13,
    borderRadius: 10,
    backgroundColor: BookLoopColors.mutedGold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  goldActionText: { fontFamily: 'Inter-SemiBold', fontSize: 12.5, color: C.text, fontWeight: '600' },
});
