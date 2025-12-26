import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  FadeIn,
  FadeOut,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '../lib/theme';

const HINTS_STORAGE_KEY = 'gesture_hints_shown';

// Define available gesture hints
const GESTURE_HINTS = [
  {
    id: 'tap',
    icon: '👆',
    title: 'Tap to explore',
    description: 'Tap any album to see its songs',
    animation: 'tap',
  },
  {
    id: 'hold',
    icon: '👆',
    title: 'Hold for details',
    description: 'Press and hold any tile to see more info',
    animation: 'hold',
  },
  {
    id: 'pinch',
    icon: '🤏',
    title: 'Pinch to zoom',
    description: 'Use two fingers to zoom in and explore',
    animation: 'pinch',
  },
  {
    id: 'swipe',
    icon: '👈',
    title: 'Swipe to navigate',
    description: 'Swipe left or right to browse albums',
    animation: 'swipe',
  },
  {
    id: 'doubletap',
    icon: '👆👆',
    title: 'Double-tap to zoom',
    description: 'Double-tap to zoom in or reset view',
    animation: 'doubletap',
  },
];

// Animated hand icon for different gestures
function AnimatedHand({ animation }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    switch (animation) {
      case 'tap':
        // Tap animation - press down and up
        scale.value = withRepeat(
          withSequence(
            withTiming(0.8, { duration: 200 }),
            withTiming(1, { duration: 200 }),
            withDelay(800, withTiming(1, { duration: 0 }))
          ),
          -1,
          false
        );
        break;

      case 'hold':
        // Hold animation - press and stay
        scale.value = withRepeat(
          withSequence(
            withTiming(0.75, { duration: 300 }),
            withDelay(1000, withTiming(0.75, { duration: 0 })),
            withTiming(1, { duration: 300 }),
            withDelay(500, withTiming(1, { duration: 0 }))
          ),
          -1,
          false
        );
        break;

      case 'swipe':
        // Swipe animation - move left to right
        translateX.value = withRepeat(
          withSequence(
            withTiming(-30, { duration: 300 }),
            withTiming(30, { duration: 600 }),
            withTiming(0, { duration: 300 }),
            withDelay(500, withTiming(0, { duration: 0 }))
          ),
          -1,
          false
        );
        break;

      case 'pinch':
        // Pinch animation - scale up and down
        scale.value = withRepeat(
          withSequence(
            withTiming(1.3, { duration: 500 }),
            withTiming(0.8, { duration: 500 }),
            withTiming(1, { duration: 300 }),
            withDelay(400, withTiming(1, { duration: 0 }))
          ),
          -1,
          false
        );
        break;

      case 'tilt':
        // Tilt animation - rotate slightly
        rotate.value = withRepeat(
          withSequence(
            withTiming(-10, { duration: 600 }),
            withTiming(10, { duration: 600 }),
            withTiming(0, { duration: 400 }),
            withDelay(300, withTiming(0, { duration: 0 }))
          ),
          -1,
          false
        );
        break;

      case 'doubletap':
        // Double tap animation
        scale.value = withRepeat(
          withSequence(
            withTiming(0.8, { duration: 100 }),
            withTiming(1, { duration: 100 }),
            withTiming(0.8, { duration: 100 }),
            withTiming(1, { duration: 100 }),
            withDelay(1000, withTiming(1, { duration: 0 }))
          ),
          -1,
          false
        );
        break;
    }
  }, [animation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.handContainer, animatedStyle]}>
      <Text style={styles.handIcon}>👆</Text>
    </Animated.View>
  );
}

// Single hint tooltip that appears near relevant UI
export function GestureHintTooltip({
  hint,
  visible,
  onDismiss,
  position = 'bottom',
}) {
  if (!visible || !hint) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onDismiss}
      accessibilityViewIsModal={true}
    >
      <Pressable style={styles.tooltipOverlay} onPress={onDismiss}>
        <Animated.View
          style={[styles.tooltipContainer]}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
        >
          <View style={styles.tooltipContent}>
            <AnimatedHand animation={hint.animation} />
            <Text style={styles.tooltipTitle}>{hint.title}</Text>
            <Text style={styles.tooltipDescription}>{hint.description}</Text>
            <Pressable style={styles.tooltipButton} onPress={onDismiss}>
              <Text style={styles.tooltipButtonText}>Got it</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// Full onboarding carousel for first-time users
export function GestureOnboarding({ visible, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const progress = useSharedValue(0);

  const availableHints = GESTURE_HINTS;

  const handleNext = () => {
    if (currentIndex < availableHints.length - 1) {
      setCurrentIndex(currentIndex + 1);
      progress.value = withSpring((currentIndex + 1) / (availableHints.length - 1));
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const currentHint = availableHints[currentIndex];
  const isLast = currentIndex === availableHints.length - 1;

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={handleSkip}
      accessibilityViewIsModal={true}
    >
      <View style={styles.onboardingOverlay}>
        <Animated.View
          style={styles.onboardingContainer}
          entering={FadeIn.duration(400)}
        >
          {/* Progress dots */}
          <View style={styles.progressDots}>
            {availableHints.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.progressDot,
                  idx === currentIndex && styles.progressDotActive,
                  idx < currentIndex && styles.progressDotComplete,
                ]}
              />
            ))}
          </View>

          {/* Hint content */}
          <View style={styles.onboardingContent}>
            <Text style={styles.onboardingIcon}>{currentHint.icon}</Text>
            <AnimatedHand animation={currentHint.animation} />
            <Text style={styles.onboardingTitle}>{currentHint.title}</Text>
            <Text style={styles.onboardingDescription}>
              {currentHint.description}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.onboardingActions}>
            <Pressable style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </Pressable>
            <Pressable style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>
                {isLast ? 'Get Started' : 'Next'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Hook to manage hint visibility
export function useGestureHints() {
  const [hintsShown, setHintsShown] = useState({});
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentHint, setCurrentHint] = useState(null);

  // Load hints state from storage
  useEffect(() => {
    AsyncStorage.getItem(HINTS_STORAGE_KEY).then(data => {
      if (data) {
        const parsed = JSON.parse(data);
        setHintsShown(parsed);
        // Check if onboarding was completed
        if (!parsed.onboardingComplete) {
          setShowOnboarding(true);
        }
      } else {
        // First time user - show onboarding
        setShowOnboarding(true);
      }
    });
  }, []);

  // Save hints state
  const saveHintsState = useCallback(async (newState) => {
    await AsyncStorage.setItem(HINTS_STORAGE_KEY, JSON.stringify(newState));
  }, []);

  // Mark onboarding as complete
  const completeOnboarding = useCallback(() => {
    const newState = { ...hintsShown, onboardingComplete: true };
    setHintsShown(newState);
    setShowOnboarding(false);
    saveHintsState(newState);
  }, [hintsShown, saveHintsState]);

  // Show a specific hint
  const showHint = useCallback((hintId) => {
    if (!hintsShown[hintId]) {
      const hint = GESTURE_HINTS.find(h => h.id === hintId);
      if (hint) {
        setCurrentHint(hint);
      }
    }
  }, [hintsShown]);

  // Dismiss current hint
  const dismissHint = useCallback(() => {
    if (currentHint) {
      const newState = { ...hintsShown, [currentHint.id]: true };
      setHintsShown(newState);
      setCurrentHint(null);
      saveHintsState(newState);
    }
  }, [currentHint, hintsShown, saveHintsState]);

  // Reset all hints (for settings/debug)
  const resetHints = useCallback(async () => {
    await AsyncStorage.removeItem(HINTS_STORAGE_KEY);
    setHintsShown({});
    setShowOnboarding(true);
  }, []);

  return {
    showOnboarding,
    completeOnboarding,
    currentHint,
    showHint,
    dismissHint,
    resetHints,
    hintsShown,
  };
}

const styles = StyleSheet.create({
  // Tooltip styles
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tooltipContainer: {
    backgroundColor: colors.bg.card,
    borderRadius: 20,
    padding: 24,
    maxWidth: 300,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  tooltipContent: {
    alignItems: 'center',
  },
  tooltipTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  tooltipDescription: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  tooltipButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  tooltipButtonText: {
    color: colors.text.inverse,
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Hand animation
  handContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handIcon: {
    fontSize: 36,
  },

  // Onboarding styles
  onboardingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  onboardingContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.bg.card,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 24,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface.light,
  },
  progressDotActive: {
    backgroundColor: colors.accent.primary,
    width: 20,
  },
  progressDotComplete: {
    backgroundColor: colors.accent.primaryBorder,
  },
  onboardingContent: {
    alignItems: 'center',
    marginBottom: 28,
  },
  onboardingIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  onboardingTitle: {
    fontSize: 22,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  onboardingDescription: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  onboardingActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: colors.surface.medium,
    alignItems: 'center',
  },
  skipButtonText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  nextButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
  },
  nextButtonText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
});
