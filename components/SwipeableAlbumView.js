import { useCallback } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { colors } from '../lib/theme';

const SWIPE_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 500;

const triggerHaptic = () => {
  if (Platform.OS !== 'web') {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
  }
};

export default function SwipeableAlbumView({
  children,
  width,
  currentAlbum,
  prevAlbum,
  nextAlbum,
  onSwipePrev,
  onSwipeNext,
  enabled = true,
}) {
  const translateX = useSharedValue(0);
  const isActive = useSharedValue(false);

  const handleSwipePrev = useCallback(() => {
    if (onSwipePrev && prevAlbum) {
      triggerHaptic();
      onSwipePrev();
    }
  }, [onSwipePrev, prevAlbum]);

  const handleSwipeNext = useCallback(() => {
    if (onSwipeNext && nextAlbum) {
      triggerHaptic();
      onSwipeNext();
    }
  }, [onSwipeNext, nextAlbum]);

  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-20, 20])
    .failOffsetY([-20, 20])
    .onStart(() => {
      'worklet';
      isActive.value = true;
    })
    .onUpdate((event) => {
      'worklet';
      // Limit swipe distance with rubber band effect
      const maxSwipe = width * 0.4;
      let clampedX = event.translationX;

      // Apply resistance at edges
      if (!prevAlbum && event.translationX > 0) {
        clampedX = event.translationX * 0.3; // Resistance when no prev
      } else if (!nextAlbum && event.translationX < 0) {
        clampedX = event.translationX * 0.3; // Resistance when no next
      }

      // Rubber band effect
      if (Math.abs(clampedX) > maxSwipe) {
        const overflow = Math.abs(clampedX) - maxSwipe;
        clampedX = Math.sign(clampedX) * (maxSwipe + overflow * 0.2);
      }

      translateX.value = clampedX;
    })
    .onEnd((event) => {
      'worklet';
      isActive.value = false;

      const shouldSwipe =
        Math.abs(event.translationX) > SWIPE_THRESHOLD ||
        Math.abs(event.velocityX) > VELOCITY_THRESHOLD;

      if (shouldSwipe) {
        if (event.translationX > 0 && prevAlbum) {
          // Swipe right -> go to previous album
          translateX.value = withTiming(width, { duration: 200 }, () => {
            runOnJS(handleSwipePrev)();
            translateX.value = 0;
          });
          return;
        } else if (event.translationX < 0 && nextAlbum) {
          // Swipe left -> go to next album
          translateX.value = withTiming(-width, { duration: 200 }, () => {
            runOnJS(handleSwipeNext)();
            translateX.value = 0;
          });
          return;
        }
      }

      // Spring back to center
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
    });

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      Math.abs(translateX.value),
      [0, width * 0.3],
      [1, 0.95],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, width * 0.3],
      [1, 0.8],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { scale },
      ],
      opacity,
    };
  });

  // Peek indicator styles
  const prevIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0.8, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity: prevAlbum ? opacity : 0,
      transform: [{ scale }],
    };
  });

  const nextIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, -SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [0, -SWIPE_THRESHOLD],
      [0.8, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity: nextAlbum ? opacity : 0,
      transform: [{ scale }],
    };
  });

  if (!enabled) {
    return <View style={styles.container}>{children}</View>;
  }

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.container}>
        {/* Previous album indicator */}
        <Animated.View style={[styles.peekIndicator, styles.prevIndicator, prevIndicatorStyle]}>
          <View style={[styles.peekDot, { backgroundColor: prevAlbum?.color || colors.fallback }]} />
          <Text style={styles.peekText} numberOfLines={1}>
            ← {prevAlbum?.display_name || ''}
          </Text>
        </Animated.View>

        {/* Main content */}
        <Animated.View style={[styles.content, animatedStyle]}>
          {children}
        </Animated.View>

        {/* Next album indicator */}
        <Animated.View style={[styles.peekIndicator, styles.nextIndicator, nextIndicatorStyle]}>
          <Text style={styles.peekText} numberOfLines={1}>
            {nextAlbum?.display_name || ''} →
          </Text>
          <View style={[styles.peekDot, { backgroundColor: nextAlbum?.color || colors.fallback }]} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  content: {
    flex: 1,
  },
  peekIndicator: {
    position: 'absolute',
    top: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface.heavy,
    borderRadius: 20,
    zIndex: 10,
  },
  prevIndicator: {
    left: 8,
    transform: [{ translateY: -20 }],
  },
  nextIndicator: {
    right: 8,
    transform: [{ translateY: -20 }],
  },
  peekDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  peekText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    maxWidth: 80,
  },
});
