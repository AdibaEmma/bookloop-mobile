/**
 * Rate Exchange — design refresh 5e
 *
 * Partner header (avatar + verified shield), 5-star rating with a live label,
 * "What went well?" quick tags, and an optional written review.
 *
 * NOTE: the ratings API accepts only { rating, review }. Selected tags are
 * folded into the review text so they're captured without an API change.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Star, ShieldCheck, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { exchangesService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { BookLoopColors } from '@/constants/theme';

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Not great',
  3: 'Okay',
  4: 'Good swap',
  5: 'Great swap!',
};

const TAGS = ['On time', 'Book as described', 'Friendly', 'Good communication'];

const C = {
  grad: [BookLoopColors.creamTop, BookLoopColors.cream] as const,
  text: BookLoopColors.deepEspresso,
  muted: BookLoopColors.authorText,
  active: BookLoopColors.coffeeBrown,
  gold: BookLoopColors.mutedGold,
  goldStroke: BookLoopColors.goldDeep,
  latte: BookLoopColors.softLatte,
  chipIdle: BookLoopColors.parchmentBeige,
  chipIdleFg: '#6B5240',
};

export default function RateExchangeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [partner, setPartner] = useState<{ name: string; initials: string }>({
    name: 'your partner',
    initials: 'BL',
  });
  const [subline, setSubline] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const ex = await exchangesService.getExchangeById(id);
        const iAmOwner = ex.owner_id === user?.id;
        const p = iAmOwner ? ex.requester : ex.owner;
        const name = `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || 'your partner';
        setPartner({
          name,
          initials:
            ((p?.first_name?.charAt(0) ?? '') + (p?.last_name?.charAt(0) ?? '')).toUpperCase() || 'BL',
        });
        const bookTitle = (ex.listing as any)?.book?.title;
        const spot = ex.meetup_spot_name;
        setSubline([bookTitle, spot].filter(Boolean).join(' · '));
      } catch (error) {
        console.error('Failed to load exchange for rating:', error);
      }
    })();
  }, [id, user?.id]);

  const toggleTag = (tag: string) => {
    Haptics.selectionAsync();
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const submit = async () => {
    if (rating === 0) {
      Alert.alert('Add a rating', 'Please pick a star rating first.');
      return;
    }
    setSubmitting(true);
    try {
      const tagLine = selectedTags.length ? `[${selectedTags.join(', ')}] ` : '';
      const body = `${tagLine}${review.trim()}`.trim();
      await exchangesService.rateExchange(id, { rating, review: body || undefined });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const firstName = partner.name.split(' ')[0];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <LinearGradient colors={C.grad} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={8} accessibilityLabel="Back">
              <ArrowLeft size={22} color={C.text} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Rate your exchange</Text>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Partner */}
            <View style={styles.partner}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{partner.initials}</Text>
                <View style={styles.avatarShield}>
                  <ShieldCheck size={22} color={C.gold} fill={C.gold} strokeWidth={1.4} />
                </View>
              </View>
              <Text style={styles.partnerQ}>How was your swap with {firstName}?</Text>
              {!!subline && <Text style={styles.partnerSub}>{subline}</Text>}
            </View>

            {/* Stars */}
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((i) => {
                const on = i <= rating;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setRating(i);
                    }}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityLabel={`${i} star${i > 1 ? 's' : ''}`}
                  >
                    <Star
                      size={38}
                      color={on ? C.goldStroke : C.latte}
                      fill={on ? C.gold : 'transparent'}
                      strokeWidth={on ? 1 : 1.6}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
            {rating > 0 && <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>}

            {/* Tags */}
            <Text style={styles.fieldLabel}>What went well?</Text>
            <View style={styles.tags}>
              {TAGS.map((tag) => {
                const on = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    activeOpacity={0.8}
                    style={[
                      styles.tag,
                      { backgroundColor: on ? C.active : C.chipIdle },
                    ]}
                  >
                    {on && <Check size={12} color="#fff" strokeWidth={2.6} />}
                    <Text style={[styles.tagText, { color: on ? '#fff' : C.chipIdleFg }]}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Review */}
            <TextInput
              value={review}
              onChangeText={setReview}
              placeholder={`Lovely, easy meetup. Thank you ${firstName}!`}
              placeholderTextColor={C.muted}
              multiline
              style={styles.review}
              textAlignVertical="top"
            />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submit, { opacity: submitting ? 0.7 : 1 }]}
              onPress={submit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Submit review</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 17, color: C.text },
  body: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 24 },
  partner: { alignItems: 'center' },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: C.latte,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontFamily: 'Poppins-Bold', fontSize: 22, color: C.text },
  avatarShield: { position: 'absolute', bottom: -2, right: -2 },
  partnerQ: { fontFamily: 'Inter-Bold', fontSize: 17, color: C.text, marginTop: 12, textAlign: 'center' },
  partnerSub: { fontFamily: 'Inter-Regular', fontSize: 12, color: C.muted, marginTop: 3 },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
  },
  ratingLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: C.active,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  fieldLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#6B5240',
    marginTop: 24,
    marginBottom: 9,
    fontWeight: '600',
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: { fontFamily: 'Inter-SemiBold', fontSize: 12, fontWeight: '600' },
  review: {
    marginTop: 18,
    minHeight: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.latte,
    backgroundColor: '#fff',
    padding: 13,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: C.text,
    lineHeight: 19,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 18,
  },
  submit: {
    height: 48,
    borderRadius: 12,
    backgroundColor: C.active,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.active,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 6,
  },
  submitText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: BookLoopColors.cream, fontWeight: '600' },
});
