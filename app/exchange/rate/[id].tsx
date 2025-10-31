/**
 * Rate Exchange Screen
 *
 * Rate a user after completing an exchange.
 *
 * Features:
 * - Star rating (1-5)
 * - Written review
 * - Submit rating
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard, GlassButton, GlassInput, Avatar } from '@/components/ui';
import { exchangesService } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';

export default function RateExchangeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handle star press
   */
  const handleStarPress = (starRating: number) => {
    setRating(starRating);
  };

  /**
   * Validate form
   */
  const validateForm = (): boolean => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return false;
    }

    return true;
  };

  /**
   * Submit rating
   */
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      await exchangesService.rateExchange(id, {
        rating,
        review: review.trim() || undefined,
      });

      Alert.alert(
        'Thank You!',
        'Your rating has been submitted successfully',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to submit rating:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to submit rating'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Render star
   */
  const renderStar = (index: number) => {
    const filled = index <= rating;

    return (
      <TouchableOpacity
        key={index}
        onPress={() => handleStarPress(index)}
        style={styles.starButton}
      >
        <Ionicons
          name={filled ? 'star' : 'star-outline'}
          size={48}
          color={filled ? BookLoopColors.burntOrange : colors.textSecondary}
        />
      </TouchableOpacity>
    );
  };

  /**
   * Get rating label
   */
  const getRatingLabel = (rating: number): string => {
    const labels: Record<number, string> = {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent',
    };
    return labels[rating] || 'Select Rating';
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Rate Exchange',
          headerShown: true,
        }}
      />

      <View style={styles.container}>
        {/* Background Gradient */}
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
          {/* Rating Section */}
          <GlassCard variant="lg" padding="xl">
            <Text style={[styles.title, { color: colors.text }]}>
              How was your experience?
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Rate your exchange experience
            </Text>

            {/* Stars */}
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map(renderStar)}
            </View>

            {/* Rating Label */}
            {rating > 0 && (
              <Text
                style={[
                  styles.ratingLabel,
                  { color: BookLoopColors.burntOrange },
                ]}
              >
                {getRatingLabel(rating)}
              </Text>
            )}
          </GlassCard>

          {/* Review Section */}
          <GlassCard variant="lg" padding="lg">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Write a Review (Optional)
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Share your thoughts about this exchange
            </Text>

            <GlassInput
              value={review}
              onChangeText={setReview}
              placeholder="The book was in great condition..."
              multiline
              numberOfLines={6}
              style={{ height: 120 }}
            />
          </GlassCard>

          {/* Tips */}
          <GlassCard variant="md" padding="md">
            <View style={styles.tipHeader}>
              <Ionicons name="bulb" size={20} color={BookLoopColors.burntOrange} />
              <Text style={[styles.tipTitle, { color: colors.text }]}>
                Rating Tips
              </Text>
            </View>

            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              • Be honest and constructive{'\n'}
              • Consider the book's condition{'\n'}
              • Think about communication{'\n'}
              • Was the meetup smooth?{'\n'}
              • Would you exchange again?
            </Text>
          </GlassCard>

          {/* Submit Button */}
          <GlassButton
            title="Submit Rating"
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            loading={isSubmitting}
            disabled={isSubmitting || rating === 0}
            icon="checkmark-circle"
            style={styles.submitButton}
          />

          {/* Skip Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.skipButton}
          >
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>
              Skip for Now
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  starButton: {
    padding: Spacing.xs,
  },
  ratingLabel: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.md,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  tipTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  tipText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 22,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  skipButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  skipText: {
    fontSize: Typography.fontSize.base,
  },
});
