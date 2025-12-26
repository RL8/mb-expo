import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Modal } from 'react-native';
import { colors } from '../lib/theme';

// Placeholder - will be replaced with real counter from backend
const FOUNDING_SPOTS_TOTAL = 1989;
const FOUNDING_SPOTS_SOLD = 0; // Will come from Supabase/backend

/**
 * PaywallOverlay - Upgrade prompt with Founding Swiftie pricing
 *
 * Shows contextual upgrade messaging with spots remaining counter.
 *
 * @param {boolean} visible - Whether the overlay is visible
 * @param {function} onClose - Called when overlay is dismissed
 * @param {function} onUpgrade - Called when upgrade button is pressed
 * @param {string} context - Context for messaging: 'album' | 'song' | 'feature' | 'edit'
 * @param {string} itemName - Name of the locked item (e.g., "Lover", "Cruel Summer")
 * @param {number} spotsSold - Number of founding spots sold (for counter display)
 */
export default function PaywallOverlay({
  visible,
  onClose,
  onUpgrade,
  context = 'feature',
  itemName,
  spotsSold = FOUNDING_SPOTS_SOLD,
}) {
  if (!visible) return null;

  const spotsRemaining = FOUNDING_SPOTS_TOTAL - spotsSold;
  const showCounter = spotsSold >= 100; // Only show after 100 sales

  const messaging = getContextualMessaging(context, itemName);

  const handleClose = () => {
    document.activeElement?.blur?.();
    onClose();
  };

  const handleUpgrade = () => {
    // On web, could open Stripe checkout directly
    // For now, just call the callback
    onUpgrade?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      accessibilityViewIsModal={true}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.container} onPress={e => e.stopPropagation()}>
          {/* Close button */}
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </Pressable>

          {/* Icon */}
          <Text style={styles.icon}>{messaging.icon}</Text>

          {/* Title */}
          <Text style={styles.title}>{messaging.title}</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>{messaging.subtitle}</Text>

          {/* Pricing */}
          <View style={styles.priceContainer}>
            <Text style={styles.price}>$13.13</Text>
            <Text style={styles.priceLabel}>one-time</Text>
          </View>

          {/* Spots counter */}
          {showCounter ? (
            <View style={styles.spotsContainer}>
              <Text style={styles.spotsEmoji}>🎉</Text>
              <Text style={styles.spotsText}>
                {spotsRemaining.toLocaleString()} of {FOUNDING_SPOTS_TOTAL.toLocaleString()} spots remaining
              </Text>
            </View>
          ) : (
            <View style={styles.spotsContainer}>
              <Text style={styles.spotsText}>
                Join the first {FOUNDING_SPOTS_TOTAL.toLocaleString()} Founding Swifties
              </Text>
            </View>
          )}

          {/* Benefits */}
          <View style={styles.benefits}>
            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={styles.benefitText}>Unlock all 11 albums</Text>
            </View>
            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={styles.benefitText}>Unlimited ranking changes</Text>
            </View>
            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={styles.benefitText}>Early access to new features</Text>
            </View>
            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>✓</Text>
              <Text style={styles.benefitText}>Lifetime access</Text>
            </View>
          </View>

          {/* CTA Button */}
          <Pressable style={styles.upgradeButton} onPress={handleUpgrade}>
            <Text style={styles.upgradeButtonText}>Become a Founding Swiftie</Text>
          </Pressable>

          {/* Later link */}
          <Pressable style={styles.laterButton} onPress={onClose}>
            <Text style={styles.laterButtonText}>Maybe later</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * InlinePaywall - Non-modal version for inline display
 */
export function InlinePaywall({
  onUpgrade,
  context = 'feature',
  itemName,
  spotsSold = FOUNDING_SPOTS_SOLD,
  compact = false,
}) {
  const spotsRemaining = FOUNDING_SPOTS_TOTAL - spotsSold;
  const showCounter = spotsSold >= 100;
  const messaging = getContextualMessaging(context, itemName);

  if (compact) {
    return (
      <View style={styles.inlineCompact}>
        <View style={styles.inlineCompactLeft}>
          <Text style={styles.inlineCompactTitle}>{messaging.shortTitle}</Text>
          {showCounter && (
            <Text style={styles.inlineCompactSpots}>
              🎉 {spotsRemaining.toLocaleString()} spots left
            </Text>
          )}
        </View>
        <Pressable style={styles.inlineCompactButton} onPress={onUpgrade}>
          <Text style={styles.inlineCompactButtonText}>$13.13</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.inline}>
      <Text style={styles.inlineIcon}>{messaging.icon}</Text>
      <Text style={styles.inlineTitle}>{messaging.title}</Text>
      <Text style={styles.inlineSubtitle}>{messaging.subtitle}</Text>

      {showCounter ? (
        <Text style={styles.inlineSpots}>
          🎉 {spotsRemaining.toLocaleString()} of {FOUNDING_SPOTS_TOTAL.toLocaleString()} spots remaining
        </Text>
      ) : (
        <Text style={styles.inlineSpots}>
          Join the first {FOUNDING_SPOTS_TOTAL.toLocaleString()} Founding Swifties
        </Text>
      )}

      <Pressable style={styles.inlineButton} onPress={onUpgrade}>
        <Text style={styles.inlineButtonText}>Unlock · $13.13 one-time</Text>
      </Pressable>
    </View>
  );
}

// Contextual messaging based on what triggered the paywall
function getContextualMessaging(context, itemName) {
  switch (context) {
    case 'album':
      return {
        icon: '💿',
        title: itemName ? `Unlock ${itemName}` : 'Unlock This Album',
        shortTitle: 'Unlock album',
        subtitle: 'Explore all songs, lyrics, and characteristics',
      };
    case 'song':
      return {
        icon: '🎵',
        title: itemName ? `Unlock "${itemName}"` : 'Unlock This Song',
        shortTitle: 'Unlock song',
        subtitle: 'See full lyrics, characteristics, and more',
      };
    case 'edit':
      return {
        icon: '✏️',
        title: 'Unlimited Edits',
        shortTitle: 'Edit rankings',
        subtitle: "You've used your free edit. Subscribe for unlimited changes.",
      };
    case 'global_songs':
      return {
        icon: '🌟',
        title: 'Global Top 3 Songs',
        shortTitle: 'Global ranking',
        subtitle: 'Rank your favorite songs across all albums',
      };
    case 'history':
      return {
        icon: '📊',
        title: 'Ranking History',
        shortTitle: 'View history',
        subtitle: 'See how your tastes have evolved over time',
      };
    default:
      return {
        icon: '✨',
        title: 'Unlock Premium',
        shortTitle: 'Go Premium',
        subtitle: 'Get full access to everything',
      };
  }
}

const styles = StyleSheet.create({
  // Modal styles
  backdrop: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: colors.bg.card,
    borderRadius: 24,
    padding: 28,
    maxWidth: 360,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent.primaryBorder,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: colors.text.secondary,
    fontFamily: 'Outfit_400Regular',
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 36,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.accent.primary,
  },
  priceLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.muted,
    marginLeft: 8,
  },
  spotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  spotsEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  spotsText: {
    fontSize: 12,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.text.secondary,
  },
  benefits: {
    width: '100%',
    marginBottom: 20,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitIcon: {
    fontSize: 14,
    color: colors.semantic.success,
    marginRight: 10,
    width: 20,
  },
  benefitText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.primary,
  },
  upgradeButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.inverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  laterButton: {
    paddingVertical: 8,
  },
  laterButtonText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.muted,
  },

  // Inline styles
  inline: {
    backgroundColor: colors.bg.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent.primaryBorder,
  },
  inlineIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  inlineTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  inlineSubtitle: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  inlineSpots: {
    fontSize: 11,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.text.muted,
    marginBottom: 16,
  },
  inlineButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  inlineButtonText: {
    fontSize: 12,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.inverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Compact inline styles
  inlineCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.medium,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.accent.primaryMuted,
  },
  inlineCompactLeft: {
    flex: 1,
  },
  inlineCompactTitle: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
  },
  inlineCompactSpots: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.text.muted,
    marginTop: 2,
  },
  inlineCompactButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginLeft: 12,
  },
  inlineCompactButtonText: {
    fontSize: 12,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.inverse,
  },
});

// Export constants for use elsewhere
export { FOUNDING_SPOTS_TOTAL };
