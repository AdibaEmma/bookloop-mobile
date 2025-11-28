import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationComplete }) => {
  // Animation values
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    // Start the animation sequence
    startAnimationSequence();
  }, []);

  const startAnimationSequence = () => {
    // Fade in and scale animation
    opacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
    });

    scale.value = withTiming(1, {
      duration: 600,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
    });

    // Trigger completion after animation duration (4500ms total)
    if (onAnimationComplete) {
      setTimeout(() => {
        onAnimationComplete();
      }, 4500);
    }
  };

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.background} />

      {/* Animated GIF Container */}
      <Animated.View style={[styles.loaderContainer, animatedStyle]}>
        <Image
          source={require('../../assets/loaders/book-loader.gif')}
          style={styles.loader}
          contentFit="contain"
          cachePolicy="memory"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E87446', // BookLoop brand orange
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E87446',
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.8,
    height: width * 0.8,
  },
  loader: {
    width: '100%',
    height: '100%',
  },
});
