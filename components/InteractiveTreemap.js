import { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors } from '../lib/theme';
import AnimatedTile from './AnimatedTile';

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 0.8,
};

export default function InteractiveTreemap({
  data,
  width,
  height,
  metric,
  suffix,
  isSmall,
  showOrder,
  onTilePress,
  onTileLongPress,
  enablePinchZoom = true,
  style,
}) {
  // Pinch-to-zoom state
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  // Double tap to reset zoom
  const resetZoom = useCallback(() => {
    'worklet';
    scale.value = withSpring(1, SPRING_CONFIG);
    translateX.value = withSpring(0, SPRING_CONFIG);
    translateY.value = withSpring(0, SPRING_CONFIG);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, []);

  // Pinch gesture for zoom
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      'worklet';
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      'worklet';
      const newScale = Math.max(0.5, Math.min(3, savedScale.value * event.scale));
      scale.value = newScale;
      focalX.value = event.focalX;
      focalY.value = event.focalY;
    })
    .onEnd(() => {
      'worklet';
      // Snap back if too small
      if (scale.value < 1) {
        resetZoom();
      } else {
        savedScale.value = scale.value;
      }
    });

  // Pan gesture for moving zoomed treemap
  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .onStart(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      'worklet';
      if (scale.value > 1) {
        // Only allow panning when zoomed in
        const maxTranslateX = (width * (scale.value - 1)) / 2;
        const maxTranslateY = (height * (scale.value - 1)) / 2;

        translateX.value = Math.max(
          -maxTranslateX,
          Math.min(maxTranslateX, savedTranslateX.value + event.translationX)
        );
        translateY.value = Math.max(
          -maxTranslateY,
          Math.min(maxTranslateY, savedTranslateY.value + event.translationY)
        );
      }
    })
    .onEnd(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Double tap to reset
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      'worklet';
      if (scale.value > 1) {
        resetZoom();
      } else {
        // Zoom in to 2x
        scale.value = withSpring(2, SPRING_CONFIG);
        savedScale.value = 2;
      }
    });

  // Combine gestures
  const composedGesture = enablePinchZoom
    ? Gesture.Simultaneous(
        Gesture.Race(doubleTapGesture, pinchGesture),
        panGesture
      )
    : Gesture.Race(doubleTapGesture);

  // Animated container style (zoom + pan)
  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  // Zoom indicator style
  const zoomIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scale.value,
      [1, 1.1, 3],
      [0, 1, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.container, { width, height }, style]}>
        <Animated.View
          style={[
            styles.treemapContent,
            { width, height },
            animatedContainerStyle,
          ]}
        >
          {data.map((item, index) => (
            <AnimatedTile
              key={item.id}
              item={item}
              metric={metric}
              suffix={suffix}
              isSmall={isSmall}
              index={index}
              showOrder={showOrder}
              onPress={onTilePress}
              onLongPress={onTileLongPress}
            />
          ))}
        </Animated.View>

        {/* Zoom indicator */}
        {enablePinchZoom && (
          <Animated.View style={[styles.zoomIndicator, zoomIndicatorStyle]}>
            <Animated.Text style={styles.zoomIndicatorText}>
              {/* Zoom level will be shown here */}
            </Animated.Text>
          </Animated.View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.primary,
  },
  treemapContent: {
    position: 'relative',
  },
  zoomIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.surface.heavy,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  zoomIndicatorText: {
    color: colors.text.secondary,
    fontSize: 10,
    fontFamily: 'JetBrainsMono_400Regular',
  },
});
