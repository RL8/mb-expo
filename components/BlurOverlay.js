import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { colors } from '../lib/theme';

/**
 * BlurOverlay - Core blur effect component
 *
 * Uses CSS backdrop-filter on web for true blur effect.
 * Falls back to semi-transparent overlay on native (for true blur, use expo-blur).
 *
 * @param {string} intensity - 'light' | 'medium' | 'heavy' (default: 'medium')
 * @param {object} style - Additional styles to apply
 */
export default function BlurOverlay({ intensity = 'medium', style }) {
  const blurConfig = BLUR_LEVELS[intensity] || BLUR_LEVELS.medium;

  return (
    <View
      style={[
        styles.overlay,
        { backgroundColor: blurConfig.backgroundColor },
        Platform.OS === 'web' && {
          backdropFilter: `blur(${blurConfig.blur}px)`,
          WebkitBackdropFilter: `blur(${blurConfig.blur}px)`,
        },
        style,
      ]}
    />
  );
}

// Blur intensity configurations
const BLUR_LEVELS = {
  light: {
    blur: 4,
    backgroundColor: 'rgba(2, 6, 23, 0.6)',  // bg.primary with 60% opacity
  },
  medium: {
    blur: 8,
    backgroundColor: 'rgba(2, 6, 23, 0.75)', // bg.primary with 75% opacity
  },
  heavy: {
    blur: 12,
    backgroundColor: 'rgba(2, 6, 23, 0.88)', // bg.primary with 88% opacity
  },
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});

// Export blur levels for external use
export { BLUR_LEVELS };
