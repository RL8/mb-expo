import React from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import BlurOverlay from './BlurOverlay';
import { colors } from '../lib/theme';

/**
 * BlurredContent - Mobbin-style FOMO wrapper
 *
 * Wraps content in a blur overlay while keeping it visible (structure visible, details obscured).
 * Content remains tappable - onPress triggers the paywall or navigation to blurred detail.
 *
 * @param {ReactNode} children - Content to blur
 * @param {boolean} isLocked - Whether content is locked (if false, renders children normally)
 * @param {string} intensity - Blur intensity: 'light' | 'medium' | 'heavy'
 * @param {function} onPress - Called when blurred content is tapped
 * @param {boolean} showLockBadge - Show lock icon badge in corner
 * @param {string} lockLabel - Optional label for lock badge (e.g., "Premium")
 * @param {object} style - Additional container styles
 */
export default function BlurredContent({
  children,
  isLocked = true,
  intensity = 'medium',
  onPress,
  showLockBadge = true,
  lockLabel,
  style,
}) {
  // If not locked, just render children
  if (!isLocked) {
    return <View style={style}>{children}</View>;
  }

  return (
    <Pressable
      style={[styles.container, style]}
      onPress={onPress}
      accessible={true}
      accessibilityLabel={lockLabel || 'Locked content. Tap to unlock.'}
      accessibilityRole="button"
    >
      {/* Content underneath blur */}
      <View style={styles.content} pointerEvents="none">
        {children}
      </View>

      {/* Blur overlay */}
      <BlurOverlay intensity={intensity} />

      {/* Lock badge */}
      {showLockBadge && (
        <View style={styles.lockBadge}>
          <Text style={styles.lockIcon}>🔒</Text>
          {lockLabel && <Text style={styles.lockLabel}>{lockLabel}</Text>}
        </View>
      )}
    </Pressable>
  );
}

/**
 * BlurredTile - Specialized version for treemap tiles
 *
 * Smaller, more subtle blur for album/song tiles in grid views.
 */
export function BlurredTile({
  children,
  isLocked = true,
  onPress,
  style,
}) {
  if (!isLocked) {
    return <View style={style}>{children}</View>;
  }

  return (
    <Pressable style={[styles.tile, style]} onPress={onPress}>
      <View style={styles.tileContent} pointerEvents="none">
        {children}
      </View>
      <BlurOverlay intensity="light" style={styles.tileBlur} />
      <View style={styles.tileLockIcon}>
        <Text style={styles.tileLockText}>🔒</Text>
      </View>
    </Pressable>
  );
}

/**
 * BlurredDetailView - Full page blur for locked detail views
 *
 * Shows the complete structure of a detail page but blurred,
 * with a floating paywall prompt.
 */
export function BlurredDetailView({
  children,
  isLocked = true,
  onUnlockPress,
  albumName,
  style,
}) {
  if (!isLocked) {
    return <View style={style}>{children}</View>;
  }

  return (
    <View style={[styles.detailContainer, style]}>
      {/* Blurred content */}
      <View style={styles.detailContent} pointerEvents="none">
        {children}
      </View>
      <BlurOverlay intensity="heavy" />

      {/* Floating unlock prompt */}
      <View style={styles.floatingPrompt}>
        <Text style={styles.floatingTitle}>
          {albumName ? `Unlock ${albumName}` : 'Unlock This Content'}
        </Text>
        <Text style={styles.floatingSubtitle}>
          Become a Founding Swiftie to explore everything
        </Text>
        <Pressable style={styles.floatingButton} onPress={onUnlockPress}>
          <Text style={styles.floatingButtonText}>Unlock Everything</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // BlurredContent styles
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    opacity: 1, // Keep content visible for structure
  },
  lockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.overlay,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  lockIcon: {
    fontSize: 12,
  },
  lockLabel: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.secondary,
    marginLeft: 4,
  },

  // BlurredTile styles
  tile: {
    position: 'relative',
    overflow: 'hidden',
  },
  tileContent: {
    opacity: 1,
  },
  tileBlur: {
    borderRadius: 8,
  },
  tileLockIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bg.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileLockText: {
    fontSize: 12,
  },

  // BlurredDetailView styles
  detailContainer: {
    flex: 1,
    position: 'relative',
  },
  detailContent: {
    flex: 1,
  },
  floatingPrompt: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: colors.bg.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent.primaryBorder,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  floatingSubtitle: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  floatingButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  floatingButtonText: {
    fontSize: 14,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.inverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
