import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { colors } from '../lib/theme';

// Smoothly animate background color based on selected album/item
export default function AnimatedBackground({
  color,
  intensity = 0.15, // How much the color affects the background
  duration = 600,
  children,
  style,
}) {
  const progress = useSharedValue(0);
  const currentColor = useSharedValue(color || colors.bg.primary);
  const previousColor = useSharedValue(colors.bg.primary);

  useEffect(() => {
    if (color && color !== currentColor.value) {
      previousColor.value = currentColor.value;
      currentColor.value = color;
      progress.value = 0;
      progress.value = withTiming(1, { duration });
    }
  }, [color, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    // Blend from previous to current color
    const blendedColor = interpolateColor(
      progress.value,
      [0, 1],
      [previousColor.value, currentColor.value]
    );

    // Mix with base background at given intensity
    const finalColor = interpolateColor(
      intensity,
      [0, 1],
      [colors.bg.primary, blendedColor]
    );

    return {
      backgroundColor: finalColor,
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
