import { memo, useCallback } from 'react';
import { Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  FadeIn,
  SlideInDown,
  ZoomIn,
  Layout,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { colors, getContrastColor, getOverlayColor } from '../lib/theme';

// Haptic feedback helper - runs on JS thread
const triggerHaptic = (type = 'light') => {
  if (Platform.OS === 'web') return;

  try {
    switch (type) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
    }
  } catch (e) {
    // Haptics not available
  }
};

function AnimatedTile({
  item,
  metric,
  suffix,
  isSmall,
  index,
  showOrder,
  onPress,
  onLongPress,
  isTrackFive,
  isVault,
  isContentMetric,
  enableExitAnimation = true,
}) {
  const textColor = getContrastColor(item.color);
  const width = item.x1 - item.x0;
  const height = item.y1 - item.y0;
  const showValue = metric?.key !== 'default' && width > 50 && height > 40;
  const nameFontSize = Math.max(Math.min(width / 7, height / 4, isSmall ? 14 : 18), 10);
  const valueFontSize = Math.max(Math.min(width / 9, height / 5, isSmall ? 11 : 13), 9);
  const orderFontSize = Math.max(Math.min(width / 10, height / 6, 11), 8);
  const showOrderNumber = showOrder && width > 40 && height > 35;

  // Content list display
  const hasContentList = isContentMetric && item.contentList && item.contentList.length > 0;
  const contentListFontSize = Math.max(Math.min(width / 12, height / 8, 10), 7);
  const maxContentItems = Math.floor((height - 50) / 14);

  // Shared values for interactions
  const pressed = useSharedValue(0);
  const isLongPressing = useSharedValue(0);

  // Callbacks for haptics (must run on JS thread)
  const onTapStart = useCallback(() => {
    triggerHaptic('light');
  }, []);

  const onTapComplete = useCallback(() => {
    triggerHaptic('medium');
    if (onPress) onPress(item);
  }, [onPress, item]);

  const onLongPressStart = useCallback(() => {
    triggerHaptic('heavy');
    if (onLongPress) onLongPress(item);
  }, [onLongPress, item]);

  // Tap gesture - replaces Pressable for smoother response
  const tapGesture = Gesture.Tap()
    .maxDuration(300)
    .onBegin(() => {
      'worklet';
      pressed.value = withSpring(1, { damping: 10, stiffness: 400 });
      runOnJS(onTapStart)();
    })
    .onFinalize((_, success) => {
      'worklet';
      if (success) {
        // Pulse effect on successful tap
        pressed.value = withSequence(
          withTiming(1.3, { duration: 60 }),
          withSpring(0, { damping: 6, stiffness: 180 })
        );
        runOnJS(onTapComplete)();
      } else {
        pressed.value = withSpring(0, { damping: 8, stiffness: 250 });
      }
    });

  // Long press gesture
  const longPressGesture = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      'worklet';
      isLongPressing.value = withSpring(1, { damping: 10, stiffness: 150 });
      runOnJS(onLongPressStart)();
    })
    .onEnd(() => {
      'worklet';
      isLongPressing.value = withSpring(0, { damping: 12, stiffness: 200 });
      pressed.value = withSpring(0, { damping: 8, stiffness: 200 });
    });

  // Combine gestures - long press takes priority
  const composedGesture = Gesture.Exclusive(longPressGesture, tapGesture);

  // Animated press feedback style
  const animatedPressStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      pressed.value,
      [0, 1, 1.3],
      [1, 0.88, 0.82],
      Extrapolation.CLAMP
    );

    const rotate = interpolate(
      pressed.value,
      [0, 1],
      [0, -1.5],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      pressed.value,
      [0, 1],
      [1, 0.75],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      pressed.value,
      [0, 1],
      [0, -3],
      Extrapolation.CLAMP
    );

    const longPressScale = interpolate(
      isLongPressing.value,
      [0, 1],
      [1, 1.06],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { scale: scale * longPressScale },
        { rotate: `${rotate}deg` },
        { translateY },
      ],
      opacity,
    };
  });

  // Position style
  const positionStyle = {
    position: 'absolute',
    left: item.x0,
    top: item.y0,
    width,
    height,
    backgroundColor: item.color,
  };

  // Track 5 glow effect
  const track5Style = isTrackFive ? {
    boxShadow: '0 0 12px rgba(251, 191, 36, 0.8)',
    elevation: 10,
  } : {};

  // Vault track dashed border
  const vaultStyle = isVault ? {
    borderStyle: 'dashed',
    borderWidth: 2,
  } : {};

  // Staggered entrance delay
  const entranceDelay = index * 60;

  // Custom entering animation: scale only (no opacity to avoid conflict with layout)
  const enteringAnimation = () => {
    'worklet';
    const animations = {
      transform: [
        { scale: withDelay(entranceDelay, withSpring(1, { damping: 12, stiffness: 110 })) }
      ],
    };
    const initialValues = {
      transform: [{ scale: 0 }],
    };
    return { initialValues, animations };
  };

  // Custom exiting animation: scale only
  const exitingAnimation = enableExitAnimation
    ? () => {
        'worklet';
        const animations = {
          transform: [{ scale: withTiming(0, { duration: 200 }) }],
        };
        const initialValues = {
          transform: [{ scale: 1 }],
        };
        return { initialValues, animations };
      }
    : undefined;

  return (
    <Animated.View
      style={[styles.tileWrapper, positionStyle]}
      entering={enteringAnimation}
      exiting={exitingAnimation}
      layout={Layout.springify().damping(14).stiffness(100).mass(0.8)}
    >
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.tileInner, animatedPressStyle]}>
          <Animated.View style={[styles.tile, track5Style, vaultStyle]}>
            {/* Order badge */}
            {showOrderNumber && (
              <Animated.View
                style={[styles.tileOrder, { backgroundColor: getOverlayColor(textColor) }]}
                entering={ZoomIn.delay(entranceDelay + 150).duration(250).springify().damping(10)}
              >
                <Text style={[styles.tileOrderText, { color: textColor, fontSize: orderFontSize }]}>
                  {index + 1}
                </Text>
              </Animated.View>
            )}

            {/* Album/Song name */}
            <Animated.Text
              style={[styles.tileName, { color: textColor, fontSize: nameFontSize }]}
              numberOfLines={2}
              adjustsFontSizeToFit
              entering={SlideInDown.delay(entranceDelay + 80).duration(280).springify().damping(14)}
            >
              {item.name}
            </Animated.Text>

            {/* Metric value */}
            {showValue && !hasContentList && (
              <Animated.Text
                style={[styles.tileValue, { color: textColor, fontSize: valueFontSize }]}
                entering={FadeIn.delay(entranceDelay + 200).duration(300)}
              >
                {item.metricValue?.toLocaleString()}{suffix}
              </Animated.Text>
            )}

            {/* Content list */}
            {hasContentList && width > 60 && height > 60 && (
              <Animated.View
                style={styles.tileContentList}
                entering={FadeIn.delay(entranceDelay + 180).duration(250)}
              >
                {item.contentList.slice(0, Math.max(maxContentItems, 1)).map((contentItem, idx) => (
                  <Text
                    key={idx}
                    style={[styles.tileContentItem, { color: textColor, fontSize: contentListFontSize }]}
                    numberOfLines={1}
                  >
                    {contentItem}
                  </Text>
                ))}
                {item.contentList.length > maxContentItems && maxContentItems > 0 && (
                  <Text style={[styles.tileContentMore, { color: textColor, fontSize: contentListFontSize }]}>
                    +{item.contentList.length - maxContentItems} more
                  </Text>
                )}
              </Animated.View>
            )}
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

export default memo(AnimatedTile, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.x0 === next.item.x0 &&
    prev.item.y0 === next.item.y0 &&
    prev.item.x1 === next.item.x1 &&
    prev.item.y1 === next.item.y1 &&
    prev.item.metricValue === next.item.metricValue &&
    prev.metric?.key === next.metric?.key &&
    prev.index === next.index &&
    prev.showOrder === next.showOrder &&
    prev.isSmall === next.isSmall
  );
});

const styles = StyleSheet.create({
  tileWrapper: {
    borderRadius: 8,
    overflow: 'visible',
  },
  tileInner: {
    flex: 1,
    borderRadius: 8,
  },
  tile: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1.5,
    borderColor: colors.border.tile,
    borderRadius: 8,
    backgroundColor: 'transparent',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
    elevation: 4,
  },
  tileName: {
    fontFamily: 'Outfit_600SemiBold',
    textAlign: 'center',
  },
  tileValue: {
    marginTop: 4,
    fontFamily: 'JetBrainsMono_400Regular',
    textAlign: 'center',
    opacity: 0.85,
  },
  tileOrder: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileOrderText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontWeight: '700',
  },
  tileContentList: {
    marginTop: 4,
    alignItems: 'center',
    width: '100%',
  },
  tileContentItem: {
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 14,
  },
  tileContentMore: {
    fontFamily: 'JetBrainsMono_400Regular',
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 2,
  },
});
