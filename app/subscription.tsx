/**
 * Subscription Screen
 *
 * View and manage subscription plans.
 *
 * Features:
 * - Current subscription status
 * - Available subscription plans
 * - Upgrade/downgrade options
 * - Payment integration with Paystack
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ChevronLeft, Check, Crown, Layers, ArrowUp, ArrowDown } from 'lucide-react-native';
import { ConfirmModal } from '@/components/ui';
import { paymentsService, Subscription, SubscriptionPlan } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
// Plan ordering, so we can tell an upgrade from a downgrade.
const TIER_RANK: Record<string, number> = { free: 0, basic: 1, premium: 2 };
const rankOf = (tier?: string) => TIER_RANK[tier ?? 'free'] ?? 0;

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [confirm, setConfirm] = useState<null | {
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
  }>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const [subscription, subscriptionPlans] = await Promise.all([
        paymentsService.getCurrentSubscription(),
        paymentsService.getSubscriptionPlans(),
      ]);

      setCurrentSubscription(subscription);
      setPlans(subscriptionPlans);

      // Default the CTA to the recommended upgrade (Basic), else the first
      // upgradeable plan above the current tier.
      const upgradeable = subscriptionPlans.filter(
        (p) => p.tier !== 'free' && p.tier !== subscription?.tier
      );
      const recommended = upgradeable.find((p) => p.tier === 'basic') || upgradeable[0];
      setSelectedTier(recommended?.tier ?? null);
    } catch (error) {
      console.error('Failed to load subscription data:', error);
      Alert.alert('Error', 'Failed to load subscription information');
    } finally {
      setIsLoading(false);
    }
  };

  const proceedToPayment = async (plan: SubscriptionPlan) => {
    try {
      setIsUpgrading(true);

      // Initialize payment for the amount the user actually agreed to — the
      // billing toggle (monthly vs discounted yearly). The server maps this
      // amount back to the tier + term, so the two can never disagree.
      const paymentData = await paymentsService.initializePayment({
        amount: effectivePrice(plan),
        method: 'card',
        purpose: 'subscription',
        subscription_id: currentSubscription?.id,
      });

      // Open Paystack checkout URL
      const supported = await Linking.canOpenURL(paymentData.authorizationUrl);

      if (supported) {
        await Linking.openURL(paymentData.authorizationUrl);

        // Show instructions
        Alert.alert(
          'Payment Opened',
          'Complete the payment in your browser. Once done, return to the app to verify your payment.',
          [
            {
              text: 'Verify Payment',
              onPress: () => handleVerifyPayment(paymentData.reference, plan.tier as 'basic' | 'premium'),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Error', 'Cannot open payment URL');
      }
    } catch (error: any) {
      console.error('Failed to initialize payment:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to initialize payment'
      );
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    const current = currentSubscription?.tier || 'free';

    if (plan.tier === 'free') {
      // Downgrade to the free plan.
      setConfirm({
        title: 'Downgrade to Free?',
        message: 'You will lose your paid features at the end of your current billing period.',
        confirmLabel: 'Downgrade',
        cancelLabel: `Keep ${cap(current)}`,
        onConfirm: async () => {
          try {
            await paymentsService.cancelSubscription();
            Alert.alert('Success', 'Subscription cancelled successfully');
            loadData();
          } catch (error) {
            Alert.alert('Error', 'Failed to cancel subscription');
          }
        },
      });
      return;
    }

    // Paid downgrade (e.g. Premium → Basic): spell out what they give up first.
    if (rankOf(plan.tier) < rankOf(current)) {
      const currentPlan = plans.find((p) => p.tier === current);
      const lost = (currentPlan?.features ?? []).filter((f) => !plan.features.includes(f));
      setConfirm({
        title: `Downgrade to ${plan.name}?`,
        message:
          `You're on ${cap(current)}. Switching to ${plan.name} gives up your ${cap(current)} benefits:` +
          (lost.length ? `\n\n${lost.map((f) => `•  ${f}`).join('\n')}` : '') +
          `\n\nThe change takes effect once payment is confirmed.`,
        confirmLabel: 'Downgrade',
        cancelLabel: `Keep ${cap(current)}`,
        onConfirm: () => proceedToPayment(plan),
      });
      return;
    }

    proceedToPayment(plan);
  };

  const handleVerifyPayment = async (reference: string, tier: 'basic' | 'premium') => {
    try {
      // Verify payment
      const verification = await paymentsService.verifyPayment({ reference });

      if (verification.status === 'success') {
        // Upgrade subscription
        await paymentsService.upgradeSubscription({
          tier,
          payment_reference: reference,
        });

        Alert.alert(
          'Success!',
          `You have successfully upgraded to ${tier} plan`,
          [{ text: 'OK', onPress: () => loadData() }]
        );
      } else {
        Alert.alert('Payment Failed', 'Your payment could not be verified. Please try again.');
      }
    } catch (error) {
      console.error('Failed to verify payment:', error);
      Alert.alert('Error', 'Failed to verify payment');
    }
  };

  const planColor = (tier: string) =>
    tier === 'basic' ? '#2F8C9E' : tier === 'premium' ? BookLoopColors.coffeeBrown : '#8B7355';

  const effectivePrice = (plan: SubscriptionPlan) =>
    billing === 'yearly' ? Math.round(plan.price * 12 * 0.8) : plan.price;

  const planFeatures = (plan: SubscriptionPlan): string[] => {
    const out: string[] = [];
    const listings = plan.limits?.listings;
    out.push(listings === -1 ? 'Unlimited active listings' : `Up to ${listings} active listings`);
    const radius = plan.limits?.radius ?? 0;
    out.push(radius >= 500 || radius === -1 ? 'Nationwide search' : `${radius}km search radius`);
    (plan.features || []).forEach((f) => {
      if (!out.includes(f)) out.push(f);
    });
    return out;
  };

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isCurrentPlan = currentSubscription?.tier === plan.tier;
    const isSelected = selectedTier === plan.tier;
    const isPopular = plan.tier === 'basic';
    const isFree = plan.tier === 'free';

    return (
      <TouchableOpacity
        key={plan.tier}
        activeOpacity={isCurrentPlan ? 1 : 0.9}
        disabled={isCurrentPlan}
        onPress={() => setSelectedTier(plan.tier)}
        style={[
          styles.planCard,
          isCurrentPlan && styles.planCardCurrent,
          isSelected && !isCurrentPlan && styles.planCardSelected,
          isPopular && !isCurrentPlan && !isSelected && styles.planCardPopular,
        ]}
      >
        {isPopular && !isCurrentPlan && (
          <View style={styles.popularRibbon}>
            <Text style={styles.popularRibbonText}>MOST POPULAR</Text>
          </View>
        )}
        <View style={styles.planTop}>
          <View style={{ flex: 1 }}>
            <View style={styles.planNameRow}>
              <Text style={[styles.planName, { color: planColor(plan.tier) }]}>{plan.name}</Text>
              {plan.tier === 'premium' && (
                <Crown size={16} color={BookLoopColors.coffeeBrown} strokeWidth={2} />
              )}
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceValue}>GHS {effectivePrice(plan)}</Text>
              {!isFree && (
                <Text style={styles.pricePeriod}>{billing === 'yearly' ? '/year' : '/month'}</Text>
              )}
            </View>
          </View>
          {isCurrentPlan ? (
            <View style={styles.currentPill}>
              <Check size={11} color={BookLoopColors.coffeeBrown} strokeWidth={2.8} />
              <Text style={styles.currentPillText}>Current</Text>
            </View>
          ) : (
            <View style={[styles.radio, isSelected && styles.radioOn]}>
              {isSelected && <Check size={13} color={BookLoopColors.cream} strokeWidth={3} />}
            </View>
          )}
        </View>
        <View style={styles.planDivider} />
        <View style={styles.featureList}>
          {planFeatures(plan).map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Check size={14} color="#3B9B7F" strokeWidth={2.8} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  const currentTier = currentSubscription?.tier || 'free';
  const currentPlan = plans.find((p) => p.tier === currentTier);
  const usedLimit = currentPlan?.limits?.listings;
  const usedLimitLabel = usedLimit === -1 ? '∞' : usedLimit ?? 3;
  const selectedPlan = plans.find((p) => p.tier === selectedTier);
  const selectedIsDowngrade = !!selectedPlan && rankOf(selectedPlan.tier) < rankOf(currentTier);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[BookLoopColors.creamTop, BookLoopColors.cream]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Back">
            <ChevronLeft size={20} color={BookLoopColors.deepEspresso} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription</Text>
        </View>

        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={BookLoopColors.coffeeBrown} />
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Current plan summary */}
              <LinearGradient
                colors={['#8B5E3C', '#6E4A2E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.summary}
              >
                <View style={styles.summaryIcon}>
                  <Layers size={23} color={BookLoopColors.mutedGold} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryLabel}>Current plan</Text>
                  <Text style={styles.summaryTier}>{cap(currentTier)}</Text>
                  <Text style={styles.summarySub}>
                    {currentSubscription?.activeListingsCount ?? 0} of {usedLimitLabel} active listings used
                  </Text>
                </View>
              </LinearGradient>

              {/* Billing toggle */}
              <View style={styles.toggle}>
                {(['monthly', 'yearly'] as const).map((b) => {
                  const on = billing === b;
                  return (
                    <TouchableOpacity
                      key={b}
                      style={[styles.toggleItem, on && styles.toggleItemOn]}
                      onPress={() => setBilling(b)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.toggleText, { color: on ? BookLoopColors.deepEspresso : '#8B7355' }]}>
                        {b === 'monthly' ? 'Monthly' : 'Yearly'}
                      </Text>
                      {b === 'yearly' && (
                        <View style={styles.savePill}>
                          <Text style={styles.savePillText}>−20%</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.plansHeading}>Available plans</Text>
              {plans.map((plan) => renderPlanCard(plan))}
            </ScrollView>

            {/* Sticky upgrade CTA */}
            {selectedPlan && currentTier !== selectedPlan.tier && (
              <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
                <TouchableOpacity
                  style={styles.upgradeBtn}
                  activeOpacity={0.9}
                  disabled={isUpgrading}
                  onPress={() => handleUpgrade(selectedPlan)}
                >
                  {isUpgrading ? (
                    <ActivityIndicator color={BookLoopColors.cream} />
                  ) : (
                    <>
                      {selectedIsDowngrade ? (
                        <ArrowDown size={18} color={BookLoopColors.cream} strokeWidth={2.2} />
                      ) : (
                        <ArrowUp size={18} color={BookLoopColors.cream} strokeWidth={2.2} />
                      )}
                      <Text style={styles.upgradeBtnText}>
                        {selectedIsDowngrade ? 'Downgrade' : 'Upgrade'} to {selectedPlan.name} · GHS{' '}
                        {effectivePrice(selectedPlan)}/
                        {billing === 'yearly' ? 'yr' : 'mo'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </SafeAreaView>

      <ConfirmModal
        visible={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        cancelLabel={confirm?.cancelLabel}
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const run = confirm?.onConfirm;
          setConfirm(null);
          run?.();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 8 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1E7D6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 17, fontWeight: '600', color: BookLoopColors.deepEspresso },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 24 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 16 },
  summaryIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: 'rgba(255,213,128,0.25)', alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontFamily: 'Inter-Medium', fontSize: 11.5, color: 'rgba(255,248,240,0.8)' },
  summaryTier: { fontFamily: 'Poppins-Bold', fontSize: 19, fontWeight: '700', color: BookLoopColors.cream, marginTop: 1 },
  summarySub: { fontFamily: 'Inter-Regular', fontSize: 11.5, color: 'rgba(255,248,240,0.82)', marginTop: 2 },
  toggle: { flexDirection: 'row', gap: 4, marginTop: 16, padding: 4, backgroundColor: '#F1E7D6', borderRadius: 12 },
  toggleItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 9 },
  toggleItemOn: { backgroundColor: '#fff', shadowColor: '#4A3528', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 1 },
  toggleText: { fontFamily: 'Inter-SemiBold', fontSize: 12.5, fontWeight: '600' },
  savePill: { backgroundColor: 'rgba(76,175,80,0.16)', paddingHorizontal: 6, borderRadius: 8 },
  savePillText: { fontFamily: 'Inter-Bold', fontSize: 9, fontWeight: '700', color: '#3B7A3F' },
  plansHeading: { fontFamily: 'Inter-Bold', fontSize: 14, fontWeight: '700', color: '#33251A', marginTop: 18, marginBottom: 12 },
  planCard: { borderWidth: 1.5, borderColor: '#EFE2CE', borderRadius: 16, padding: 16, backgroundColor: '#fff', marginBottom: 14, position: 'relative' },
  planCardCurrent: { opacity: 0.86 },
  planCardSelected: { borderWidth: 2, borderColor: BookLoopColors.coffeeBrown, backgroundColor: '#FBF3E6', shadowColor: BookLoopColors.coffeeBrown, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 6 },
  planCardPopular: { borderWidth: 1.5, borderColor: '#E9CF9F' },
  planNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D4C0A0', alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: BookLoopColors.coffeeBrown, borderColor: BookLoopColors.coffeeBrown },
  popularRibbon: { position: 'absolute', top: -10, left: 16, backgroundColor: BookLoopColors.coffeeBrown, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9 },
  popularRibbonText: { fontFamily: 'Inter-Bold', fontSize: 9.5, fontWeight: '700', letterSpacing: 0.4, color: BookLoopColors.cream },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planName: { fontFamily: 'Poppins-Bold', fontSize: 17, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 },
  priceValue: { fontFamily: 'Poppins-Bold', fontSize: 22, fontWeight: '800', color: BookLoopColors.deepEspresso },
  pricePeriod: { fontFamily: 'Inter-Medium', fontSize: 12, color: '#8B7355' },
  currentPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1E7D6', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20 },
  currentPillText: { fontFamily: 'Inter-SemiBold', fontSize: 10.5, fontWeight: '600', color: BookLoopColors.coffeeBrown },
  planDivider: { height: 1, backgroundColor: '#F2E9DA', marginVertical: 12 },
  featureList: { gap: 9 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  featureText: { fontFamily: 'Inter-Medium', fontSize: 12.5, color: BookLoopColors.deepEspresso, flex: 1 },
  footer: { paddingHorizontal: 18, paddingTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EFE2CE' },
  upgradeBtn: { height: 48, borderRadius: 12, backgroundColor: BookLoopColors.coffeeBrown, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: BookLoopColors.coffeeBrown, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 6 },
  upgradeBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, fontWeight: '600', color: BookLoopColors.cream },
});
