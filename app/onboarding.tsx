/**
 * Onboarding Screen
 *
 * First-time user onboarding experience.
 *
 * Features:
 * - Welcome slides introducing BookLoop
 * - App benefits and features
 * - Call-to-action to sign up or login
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Welcome to BookLoop',
    description: 'Exchange books with readers in your community. Share knowledge, save money, and discover new reads.',
    icon: 'book',
    color: BookLoopColors.burntOrange,
  },
  {
    id: '2',
    title: 'Find Books Nearby',
    description: 'Browse available books in your area. Connect with local book lovers and arrange safe meetups.',
    icon: 'location',
    color: BookLoopColors.softTeal,
  },
  {
    id: '3',
    title: 'Build Your Library',
    description: 'List your books for exchange. Track your reading journey and earn karma points for successful swaps.',
    icon: 'library',
    color: BookLoopColors.coffeeBrown,
  },
  {
    id: '4',
    title: 'Safe & Secure',
    description: 'Meet at verified public locations. Verified users, ratings, and reviews ensure trustworthy exchanges.',
    icon: 'shield-checkmark',
    color: BookLoopColors.burntOrange,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    router.replace('/(auth)/welcome');
  };

  const handleGetStarted = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    router.replace('/(auth)/welcome');
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon} size={80} color={item.color} />
      </View>

      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  const renderDot = (index: number) => (
    <View
      key={index}
      style={[
        styles.dot,
        {
          backgroundColor:
            index === currentIndex
              ? BookLoopColors.burntOrange
              : 'rgba(0,0,0,0.2)',
          width: index === currentIndex ? 24 : 8,
        },
      ]}
    />
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[BookLoopColors.cream, BookLoopColors.lightPeach]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Skip Button */}
      {currentIndex < slides.length - 1 && (
        <View style={styles.skipContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Slides */}
      <View style={styles.slidesContainer}>
        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setCurrentIndex(index);
          }}
          keyExtractor={(item) => item.id}
          bounces={false}
        />
      </View>

      {/* Bottom Section - Pagination and Button */}
      <View style={styles.bottomSection}>
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {slides.map((_, index) => renderDot(index))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {currentIndex < slides.length - 1 ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[BookLoopColors.burntOrange, BookLoopColors.deepBrown]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={styles.buttonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleGetStarted}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[BookLoopColors.burntOrange, BookLoopColors.deepBrown]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={styles.buttonText}>Get Started</Text>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  skipButton: {
    padding: Spacing.sm,
  },
  skipText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: BookLoopColors.burntOrange,
  },
  slidesContainer: {
    flex: 1,
    paddingTop: 80,
  },
  bottomSection: {
    paddingBottom: 40,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: BookLoopColors.deepBrown,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: Typography.fontSize.base,
    color: BookLoopColors.charcoal,
    textAlign: 'center',
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  actions: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },
  actionButton: {
    width: '100%',
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
});
