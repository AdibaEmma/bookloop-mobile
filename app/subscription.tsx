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
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard, GlassButton } from '@/components/ui';
import { paymentsService, Subscription, SubscriptionPlan } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';

export default function SubscriptionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);

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
    } catch (error) {
      console.error('Failed to load subscription data:', error);
      Alert.alert('Error', 'Failed to load subscription information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (plan.tier === 'free') {
      // Downgrade to free
      Alert.alert(
        'Cancel Subscription?',
        'Are you sure you want to downgrade to the Free plan? You will lose premium features at the end of your current billing period.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            style: 'destructive',
            onPress: async () => {
              try {
                await paymentsService.cancelSubscription();
                Alert.alert('Success', 'Subscription cancelled successfully');
                loadData();
              } catch (error) {
                Alert.alert('Error', 'Failed to cancel subscription');
              }
            },
          },
        ]
      );
      return;
    }

    try {
      setIsUpgrading(true);

      // Initialize payment
      const paymentData = await paymentsService.initializePayment({
        amount: plan.price,
        method: 'card',
        purpose: 'subscription',
        subscription_id: currentSubscription?.id,
      });

      // Open Paystack checkout URL
      const supported = await Linking.canOpenURL(paymentData.authorization_url);

      if (supported) {
        await Linking.openURL(paymentData.authorization_url);

        // Show instructions
        Alert.alert(
          'Payment Opened',
          'Complete the payment in your browser. Once done, return to the app to verify your payment.',
          [
            {
              text: 'Verify Payment',
              onPress: () => handleVerifyPayment(paymentData.reference, plan.tier),
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

  const getPlanBadgeColor = (tier: string) => {
    switch (tier) {
      case 'premium':
        return BookLoopColors.burntOrange;
      case 'basic':
        return BookLoopColors.softTeal;
      default:
        return colors.textSecondary;
    }
  };

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isCurrentPlan = currentSubscription?.tier === plan.tier;
    const canDowngrade = plan.tier === 'free' && currentSubscription?.tier !== 'free';

    return (
      <GlassCard
        key={plan.tier}
        variant="lg"
        padding="lg"
        style={[
          styles.planCard,
          isCurrentPlan && {
            borderWidth: 2,
            borderColor: BookLoopColors.burntOrange,
          },
        ]}
      >
        {isCurrentPlan && (
          <View style={[styles.currentBadge, { backgroundColor: BookLoopColors.burntOrange }]}>
            <Text style={styles.currentBadgeText}>Current Plan</Text>
          </View>
        )}

        <View style={styles.planHeader}>
          <Text style={[styles.planName, { color: getPlanBadgeColor(plan.tier) }]}>
            {plan.name}
          </Text>
          <View style={styles.priceContainer}>
            <Text style={[styles.price, { color: colors.text }]}>
              GHS {plan.price}
            </Text>
            {plan.price > 0 && (
              <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>
                /month
              </Text>
            )}
          </View>
        </View>

        <View style={styles.limitsContainer}>
          <View style={styles.limitItem}>
            <Ionicons name="book" size={16} color={colors.textSecondary} />
            <Text style={[styles.limitText, { color: colors.textSecondary }]}>
              {plan.limits.listings === -1 ? 'Unlimited' : plan.limits.listings} active listings
            </Text>
          </View>
          <View style={styles.limitItem}>
            <Ionicons name="location" size={16} color={colors.textSecondary} />
            <Text style={[styles.limitText, { color: colors.textSecondary }]}>
              {plan.limits.radius}km search radius
            </Text>
          </View>
        </View>

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={18} color={BookLoopColors.softTeal} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                {feature}
              </Text>
            </View>
          ))}
        </View>

        {!isCurrentPlan && (
          <GlassButton
            title={canDowngrade ? 'Downgrade' : 'Upgrade'}
            onPress={() => handleUpgrade(plan)}
            variant={canDowngrade ? 'secondary' : 'primary'}
            size="md"
            loading={isUpgrading}
            disabled={isUpgrading}
            icon={canDowngrade ? 'arrow-down' : 'arrow-up'}
          />
        )}
      </GlassCard>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <LinearGradient
          colors={
            colorScheme === 'light'
              ? [BookLoopColors.cream, BookLoopColors.lightPeach]
              : [BookLoopColors.deepBrown, BookLoopColors.charcoal]
          }
          style={StyleSheet.absoluteFillObject}
        />
        <ActivityIndicator size="large" color={BookLoopColors.burntOrange} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Subscription',
          headerShown: true,
        }}
      />

      <View style={styles.container}>
        <LinearGradient
          colors={
            colorScheme === 'light'
              ? [BookLoopColors.cream, BookLoopColors.lightPeach]
              : [BookLoopColors.deepBrown, BookLoopColors.charcoal]
          }
          style={StyleSheet.absoluteFillObject}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Current Status */}
          <GlassCard variant="lg" padding="lg">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Current Subscription
            </Text>

            <View style={styles.statusContainer}>
              <View style={styles.statusInfo}>
                <Text style={[styles.currentTier, { color: BookLoopColors.burntOrange }]}>
                  {currentSubscription?.tier.toUpperCase()}
                </Text>
                <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                  {currentSubscription?.active_listings_count || 0} active listings
                </Text>
                {currentSubscription?.tier !== 'free' && (
                  <Text style={[styles.expiryText, { color: colors.textSecondary }]}>
                    {currentSubscription?.auto_renew ? 'Renews' : 'Expires'} on{' '}
                    {new Date(currentSubscription?.expires_at || '').toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
          </GlassCard>

          {/* Plans */}
          <Text style={[styles.plansHeader, { color: colors.text }]}>
            Available Plans
          </Text>

          {plans.map((plan) => renderPlanCard(plan))}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.md,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statusInfo: {
    flex: 1,
  },
  currentTier: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 4,
  },
  statusText: {
    fontSize: Typography.fontSize.sm,
    marginBottom: 2,
  },
  expiryText: {
    fontSize: Typography.fontSize.xs,
  },
  plansHeader: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  planCard: {
    position: 'relative',
  },
  currentBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  planHeader: {
    marginBottom: Spacing.md,
  },
  planName: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
  },
  pricePeriod: {
    fontSize: Typography.fontSize.sm,
    marginLeft: 4,
  },
  limitsContainer: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  limitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  limitText: {
    fontSize: Typography.fontSize.sm,
  },
  featuresContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureText: {
    fontSize: Typography.fontSize.sm,
    flex: 1,
  },
});
