import { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, Modal, Platform, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
// Note: LottieView uses embedded JSON objects for animations (no external files needed)
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
} from 'react-native-reanimated';
import { colors } from '../lib/theme';

const COACH_STORAGE_KEY = 'gesture_coach_completed';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Lottie animation URLs from LottieFiles CDN (free, commonly used gesture animations)
const LOTTIE_ANIMATIONS = {
  tap: 'https://lottie.host/a3e2a7a3-5c3e-4d0e-8e3e-3a5e3d0e8e3e/tap-gesture.json',
  longPress: 'https://lottie.host/b4f3b8b4-6d4f-5e1f-9f4f-4b6f4e1f9f4f/long-press.json',
  swipe: 'https://lottie.host/c5g4c9c5-7e5g-6f2g-0g5g-5c7g5f2g0g5g/swipe-gesture.json',
  pinch: 'https://lottie.host/d6h5d0d6-8f6h-7g3h-1h6h-6d8h6g3h1h6h/pinch-zoom.json',
};

// Embedded Lottie JSON for tap gesture (compact, self-contained)
const TAP_GESTURE_ANIMATION = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 200,
  h: 200,
  nm: 'Tap Gesture',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'Hand',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            { t: 0, s: [100, 120], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
            { t: 15, s: [100, 100], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
            { t: 25, s: [100, 120], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
            { t: 60, s: [100, 120] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [100, 100], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
            { t: 15, s: [90, 90], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
            { t: 25, s: [100, 100], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
            { t: 60, s: [100, 100] },
          ],
        },
      },
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ty: 'el',
              s: { a: 0, k: [50, 50] },
              p: { a: 0, k: [0, -30] },
              nm: 'Finger',
            },
            {
              ty: 'rc',
              d: 1,
              s: { a: 0, k: [30, 60] },
              p: { a: 0, k: [0, 10] },
              r: { a: 0, k: 15 },
              nm: 'Palm',
            },
            {
              ty: 'fl',
              c: { a: 0, k: [0.98, 0.85, 0.75, 1] },
              o: { a: 0, k: 100 },
              r: 1,
              nm: 'Fill',
            },
            {
              ty: 'tr',
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
            },
          ],
          nm: 'Hand Shape',
        },
      ],
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: 'Ripple',
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 15, s: [80], i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
            { t: 45, s: [0] },
          ],
        },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 15, s: [50, 50], i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
            { t: 45, s: [200, 200] },
          ],
        },
      },
      shapes: [
        {
          ty: 'el',
          s: { a: 0, k: [40, 40] },
          p: { a: 0, k: [0, 0] },
          nm: 'Circle',
        },
        {
          ty: 'st',
          c: { a: 0, k: [0.4, 0.8, 1, 1] },
          o: { a: 0, k: 100 },
          w: { a: 0, k: 3 },
          lc: 2,
          lj: 2,
          nm: 'Stroke',
        },
      ],
    },
  ],
};

// Embedded Lottie JSON for long press gesture
const LONG_PRESS_ANIMATION = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 90,
  w: 200,
  h: 200,
  nm: 'Long Press',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'Hand',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            { t: 0, s: [100, 130], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
            { t: 15, s: [100, 105], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
            { t: 70, s: [100, 105], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
            { t: 90, s: [100, 130] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100] },
      },
      shapes: [
        {
          ty: 'gr',
          it: [
            { ty: 'el', s: { a: 0, k: [50, 50] }, p: { a: 0, k: [0, -30] }, nm: 'Finger' },
            { ty: 'rc', d: 1, s: { a: 0, k: [30, 60] }, p: { a: 0, k: [0, 10] }, r: { a: 0, k: 15 }, nm: 'Palm' },
            { ty: 'fl', c: { a: 0, k: [0.98, 0.85, 0.75, 1] }, o: { a: 0, k: 100 }, r: 1, nm: 'Fill' },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Hand Shape',
        },
      ],
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: 'Progress Ring',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: -90 },
        p: { a: 0, k: [100, 100] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100] },
      },
      shapes: [
        {
          ty: 'el',
          s: { a: 0, k: [70, 70] },
          p: { a: 0, k: [0, 0] },
          nm: 'Circle',
        },
        {
          ty: 'st',
          c: { a: 0, k: [0.4, 0.8, 1, 1] },
          o: { a: 0, k: 100 },
          w: { a: 0, k: 4 },
          lc: 2,
          lj: 2,
          nm: 'Stroke',
        },
        {
          ty: 'tm',
          s: { a: 0, k: 0 },
          e: {
            a: 1,
            k: [
              { t: 15, s: [0], i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
              { t: 70, s: [100] },
            ],
          },
          o: { a: 0, k: 0 },
          m: 1,
          nm: 'Trim',
        },
      ],
    },
  ],
};

// Embedded Lottie JSON for swipe gesture
const SWIPE_ANIMATION = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 200,
  h: 200,
  nm: 'Swipe Gesture',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'Hand',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: -15 },
        p: {
          a: 1,
          k: [
            { t: 0, s: [60, 100], i: { x: 0.2, y: 1 }, o: { x: 0.8, y: 0 } },
            { t: 30, s: [140, 100], i: { x: 0.2, y: 1 }, o: { x: 0.8, y: 0 } },
            { t: 45, s: [140, 100], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
            { t: 60, s: [60, 100] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100] },
      },
      shapes: [
        {
          ty: 'gr',
          it: [
            { ty: 'el', s: { a: 0, k: [50, 50] }, p: { a: 0, k: [0, -30] }, nm: 'Finger' },
            { ty: 'rc', d: 1, s: { a: 0, k: [30, 60] }, p: { a: 0, k: [0, 10] }, r: { a: 0, k: 15 }, nm: 'Palm' },
            { ty: 'fl', c: { a: 0, k: [0.98, 0.85, 0.75, 1] }, o: { a: 0, k: 100 }, r: 1, nm: 'Fill' },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Hand Shape',
        },
      ],
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: 'Trail',
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 5, s: [0] },
            { t: 15, s: [60] },
            { t: 35, s: [0] },
          ],
        },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100] },
      },
      shapes: [
        {
          ty: 'rc',
          d: 1,
          s: { a: 0, k: [60, 4] },
          p: { a: 0, k: [0, 0] },
          r: { a: 0, k: 2 },
          nm: 'Trail Line',
        },
        {
          ty: 'fl',
          c: { a: 0, k: [0.4, 0.8, 1, 1] },
          o: { a: 0, k: 100 },
          r: 1,
          nm: 'Fill',
        },
      ],
    },
    {
      ddd: 0,
      ind: 3,
      ty: 4,
      nm: 'Arrow',
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [100] },
            { t: 30, s: [100] },
            { t: 45, s: [0] },
          ],
        },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [160, 100] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100] },
      },
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ty: 'sh',
              ks: {
                a: 0,
                k: {
                  c: false,
                  v: [[-10, -10], [0, 0], [-10, 10]],
                  i: [[0, 0], [0, 0], [0, 0]],
                  o: [[0, 0], [0, 0], [0, 0]],
                },
              },
              nm: 'Arrow Path',
            },
            { ty: 'st', c: { a: 0, k: [0.4, 0.8, 1, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 3 }, lc: 2, lj: 2, nm: 'Stroke' },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Arrow Group',
        },
      ],
    },
  ],
};

// Embedded Lottie JSON for pinch gesture
const PINCH_ANIMATION = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 200,
  h: 200,
  nm: 'Pinch Gesture',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'Finger 1',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 45 },
        p: {
          a: 1,
          k: [
            { t: 0, s: [70, 70], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
            { t: 20, s: [90, 90], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
            { t: 40, s: [60, 60], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
            { t: 60, s: [70, 70] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [80, 80] },
      },
      shapes: [
        {
          ty: 'gr',
          it: [
            { ty: 'el', s: { a: 0, k: [40, 40] }, p: { a: 0, k: [0, 0] }, nm: 'Finger' },
            { ty: 'fl', c: { a: 0, k: [0.98, 0.85, 0.75, 1] }, o: { a: 0, k: 100 }, r: 1, nm: 'Fill' },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Finger Shape',
        },
      ],
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: 'Finger 2',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 45 },
        p: {
          a: 1,
          k: [
            { t: 0, s: [130, 130], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
            { t: 20, s: [110, 110], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
            { t: 40, s: [140, 140], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
            { t: 60, s: [130, 130] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [80, 80] },
      },
      shapes: [
        {
          ty: 'gr',
          it: [
            { ty: 'el', s: { a: 0, k: [40, 40] }, p: { a: 0, k: [0, 0] }, nm: 'Finger' },
            { ty: 'fl', c: { a: 0, k: [0.98, 0.85, 0.75, 1] }, o: { a: 0, k: 100 }, r: 1, nm: 'Fill' },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Finger Shape',
        },
      ],
    },
    {
      ddd: 0,
      ind: 3,
      ty: 4,
      nm: 'Zoom Lines',
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 15, s: [0] },
            { t: 25, s: [80] },
            { t: 45, s: [0] },
          ],
        },
        r: { a: 0, k: 45 },
        p: { a: 0, k: [100, 100] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 20, s: [80, 80], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
            { t: 40, s: [120, 120] },
          ],
        },
      },
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ty: 'sh',
              ks: {
                a: 0,
                k: {
                  c: false,
                  v: [[-25, -25], [-15, -15]],
                  i: [[0, 0], [0, 0]],
                  o: [[0, 0], [0, 0]],
                },
              },
              nm: 'Line 1',
            },
            {
              ty: 'sh',
              ks: {
                a: 0,
                k: {
                  c: false,
                  v: [[25, 25], [15, 15]],
                  i: [[0, 0], [0, 0]],
                  o: [[0, 0], [0, 0]],
                },
              },
              nm: 'Line 2',
            },
            { ty: 'st', c: { a: 0, k: [0.4, 0.8, 1, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 2 }, lc: 2, lj: 2, nm: 'Stroke' },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Lines Group',
        },
      ],
    },
  ],
};

// Gesture definitions with embedded animations
const GESTURES = [
  {
    id: 'tap',
    title: 'Tap to Explore',
    description: 'Tap any album tile to see its songs and details',
    animation: TAP_GESTURE_ANIMATION,
  },
  {
    id: 'longPress',
    title: 'Hold for Quick Preview',
    description: 'Press and hold any tile to see a quick preview without navigating',
    animation: LONG_PRESS_ANIMATION,
  },
  {
    id: 'swipe',
    title: 'Swipe to Navigate',
    description: 'Swipe left or right to move between albums',
    animation: SWIPE_ANIMATION,
  },
  {
    id: 'pinch',
    title: 'Pinch to Zoom',
    description: 'Use two fingers to zoom in and explore smaller tiles',
    animation: PINCH_ANIMATION,
  },
];

// Individual gesture coach card
function GestureCard({ gesture, isActive }) {
  const lottieRef = useRef(null);

  useEffect(() => {
    if (isActive && lottieRef.current) {
      lottieRef.current.play();
    }
  }, [isActive]);

  return (
    <View style={styles.gestureCard}>
      <View style={styles.animationContainer}>
        <LottieView
          ref={lottieRef}
          source={gesture.animation}
          autoPlay={isActive}
          loop
          style={styles.lottieAnimation}
        />
      </View>
      <Text style={styles.gestureTitle}>{gesture.title}</Text>
      <Text style={styles.gestureDescription}>{gesture.description}</Text>
    </View>
  );
}

// Full-screen gesture coach onboarding
export function GestureCoachOnboarding({ visible, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentGesture = GESTURES[currentIndex];
  const isLast = currentIndex === GESTURES.length - 1;

  const handleNext = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [isLast, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={handleSkip}
    >
      <Animated.View
        style={styles.overlay}
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
      >
        <Animated.View
          style={styles.container}
          entering={SlideInUp.duration(400).springify().damping(15)}
          exiting={SlideOutDown.duration(300)}
        >
          {/* Progress indicators */}
          <View style={styles.progressContainer}>
            {GESTURES.map((_, idx) => (
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

          {/* Gesture animation and info */}
          <GestureCard gesture={currentGesture} isActive />

          {/* Action buttons */}
          <View style={styles.actions}>
            <Pressable
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </Pressable>
            <Pressable
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>
                {isLast ? 'Get Started' : 'Next'}
              </Text>
            </Pressable>
          </View>

          {/* Hint text */}
          <Text style={styles.hintText}>
            {currentIndex + 1} of {GESTURES.length}
          </Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// Inline gesture hint (shows briefly on relevant screens)
export function InlineGestureHint({ gestureId, visible, onDismiss, position = 'center' }) {
  const gesture = GESTURES.find(g => g.id === gestureId);
  const lottieRef = useRef(null);

  useEffect(() => {
    if (visible && lottieRef.current) {
      lottieRef.current.play();
    }
  }, [visible]);

  if (!visible || !gesture) return null;

  const positionStyle = {
    top: position === 'top' ? 100 : position === 'center' ? '40%' : undefined,
    bottom: position === 'bottom' ? 100 : undefined,
  };

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.inlineOverlay} onPress={onDismiss}>
        <Animated.View
          style={[styles.inlineContainer, positionStyle]}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
        >
          <View style={styles.inlineAnimation}>
            <LottieView
              ref={lottieRef}
              source={gesture.animation}
              autoPlay
              loop
              style={styles.inlineLottie}
            />
          </View>
          <Text style={styles.inlineTitle}>{gesture.title}</Text>
          <Text style={styles.inlineDescription}>{gesture.description}</Text>
          <Pressable style={styles.gotItButton} onPress={onDismiss}>
            <Text style={styles.gotItText}>Got it</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// Hook to manage gesture coach state
export function useGestureCoach() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [completedGestures, setCompletedGestures] = useState({});
  const [activeHint, setActiveHint] = useState(null);

  // Load saved state
  useEffect(() => {
    AsyncStorage.getItem(COACH_STORAGE_KEY).then(data => {
      if (data) {
        const parsed = JSON.parse(data);
        setCompletedGestures(parsed);
      } else {
        // First time - show onboarding
        setShowOnboarding(true);
      }
    });
  }, []);

  // Save completed state
  const saveState = useCallback(async (newState) => {
    await AsyncStorage.setItem(COACH_STORAGE_KEY, JSON.stringify(newState));
  }, []);

  // Complete onboarding
  const completeOnboarding = useCallback(() => {
    const newState = { ...completedGestures, onboardingComplete: true };
    setCompletedGestures(newState);
    setShowOnboarding(false);
    saveState(newState);
  }, [completedGestures, saveState]);

  // Show specific gesture hint
  const showGestureHint = useCallback((gestureId) => {
    if (!completedGestures[gestureId] && completedGestures.onboardingComplete) {
      setActiveHint(gestureId);
    }
  }, [completedGestures]);

  // Dismiss current hint
  const dismissHint = useCallback(() => {
    if (activeHint) {
      const newState = { ...completedGestures, [activeHint]: true };
      setCompletedGestures(newState);
      setActiveHint(null);
      saveState(newState);
    }
  }, [activeHint, completedGestures, saveState]);

  // Reset (for testing/settings)
  const resetCoach = useCallback(async () => {
    await AsyncStorage.removeItem(COACH_STORAGE_KEY);
    setCompletedGestures({});
    setShowOnboarding(true);
  }, []);

  return {
    showOnboarding,
    completeOnboarding,
    activeHint,
    showGestureHint,
    dismissHint,
    resetCoach,
    completedGestures,
  };
}

const styles = StyleSheet.create({
  // Onboarding overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.bg.card,
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.medium,
    boxShadow: '0 8px 24px rgba(56, 189, 248, 0.3)',
    elevation: 16,
  },

  // Progress dots
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface.light,
  },
  progressDotActive: {
    width: 24,
    backgroundColor: colors.accent.primary,
  },
  progressDotComplete: {
    backgroundColor: colors.accent.primaryBorder,
  },

  // Gesture card
  gestureCard: {
    alignItems: 'center',
    marginBottom: 32,
  },
  animationContainer: {
    width: 160,
    height: 160,
    marginBottom: 24,
    backgroundColor: colors.surface.medium,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border.subtle,
  },
  lottieAnimation: {
    width: 140,
    height: 140,
  },
  gestureTitle: {
    fontSize: 22,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  gestureDescription: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },

  // Action buttons
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: colors.surface.medium,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  skipButtonText: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
  },
  nextButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.inverse,
  },
  hintText: {
    fontSize: 12,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.text.muted,
    letterSpacing: 1,
  },

  // Inline hint
  inlineOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    backgroundColor: colors.bg.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  inlineAnimation: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  inlineLottie: {
    width: 100,
    height: 100,
  },
  inlineTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  inlineDescription: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  gotItButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 20,
  },
  gotItText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.inverse,
  },
});
