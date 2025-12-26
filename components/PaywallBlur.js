import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Linking, ActivityIndicator, Modal } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { colors } from '../lib/theme';

// Premium checkout URL - replace with your actual Stripe Payment Link
const CHECKOUT_URL = 'https://buy.stripe.com/test_fZe5o52dDbkQ2fS4gj';

export function PaywallBlur({ children, feature = 'premium' }) {
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const checkoutLoading = useSubscriptionStore((state) => state.checkoutLoading);
  const userId = useAuthStore((state) => state.user?.id);
  const openCheckout = useSubscriptionStore((state) => state.openCheckout);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [error, setError] = useState(null);

  if (isPremium) {
    return children;
  }

  const handleUpgrade = async () => {
    setError(null);
    if (Platform.OS === 'web') {
      try {
        await openCheckout(userId);
      } catch (err) {
        console.error('Checkout error:', err);
        // Fallback to direct link if API not set up
        window.open(CHECKOUT_URL, '_blank');
      }
    } else {
      setShowUpgrade(true);
    }
  };

  return (
    <View style={styles.container}>
      {/* Blurred content */}
      <View style={styles.blurredContent}>
        {children}
        <View style={styles.blurOverlay} />
      </View>

      {/* Upgrade prompt */}
      <Pressable
        style={styles.upgradePrompt}
        onPress={handleUpgrade}
        disabled={checkoutLoading}
      >
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.upgradeTitle}>Premium Feature</Text>
        <Text style={styles.upgradeText}>
          {Platform.OS === 'web'
            ? 'Unlock similar & different songs with Premium'
            : 'Visit web version to unlock'}
        </Text>
        <View style={[styles.upgradeButton, checkoutLoading && styles.upgradeButtonLoading]}>
          {checkoutLoading ? (
            <ActivityIndicator color={colors.text.inverse} size="small" />
          ) : (
            <Text style={styles.upgradeButtonText}>
              {Platform.OS === 'web' ? 'Upgrade · $13.13/year' : 'Learn More'}
            </Text>
          )}
        </View>
      </Pressable>

      {/* Mobile upgrade modal */}
      <Modal
        visible={showUpgrade && Platform.OS !== 'web'}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUpgrade(false)}
      >
        <View
          style={styles.mobileModalOverlay}
          accessibilityViewIsModal={true}
          accessibilityLabel="Upgrade information"
        >
          <View style={styles.mobileModal}>
            <Text style={styles.mobileModalTitle}>Upgrade on Web</Text>
            <Text style={styles.mobileModalText}>
              To unlock premium features, please visit our web version at:
            </Text>
            <Text style={styles.mobileModalUrl}>taylorswift.app/premium</Text>
            <Pressable
              style={styles.mobileModalClose}
              onPress={() => setShowUpgrade(false)}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Text style={styles.mobileModalCloseText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Simpler version - just shows blur with unlock button inline
export function BlurredSection({ children, title, onNavigateToPremium }) {
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const checkoutLoading = useSubscriptionStore((state) => state.checkoutLoading);
  const userId = useAuthStore((state) => state.user?.id);
  const openCheckout = useSubscriptionStore((state) => state.openCheckout);

  if (isPremium) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {children}
      </View>
    );
  }

  const handleUpgrade = async () => {
    // If a navigation callback is provided, use it (embedded checkout flow)
    if (onNavigateToPremium) {
      onNavigateToPremium();
      return;
    }
    // Otherwise fall back to redirect checkout
    if (Platform.OS === 'web') {
      try {
        await openCheckout(userId);
      } catch (error) {
        window.open(CHECKOUT_URL, '_blank');
      }
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Pressable
          style={[styles.unlockBadge, checkoutLoading && styles.unlockBadgeLoading]}
          onPress={handleUpgrade}
          disabled={checkoutLoading}
        >
          {checkoutLoading ? (
            <ActivityIndicator color={colors.semantic.warning} size={10} />
          ) : (
            <Text style={styles.unlockBadgeText}>🔒 Unlock</Text>
          )}
        </Pressable>
      </View>
      <View style={styles.blurredSection}>
        {children}
        <View style={styles.sectionBlur} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  blurredContent: {
    position: 'relative',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg.overlay,
    // On web, use backdrop-filter for real blur
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    }),
  },
  upgradePrompt: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lockIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  upgradeTitle: {
    fontSize: 14,
    color: colors.text.primary,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 4,
  },
  upgradeText: {
    fontSize: 11,
    color: colors.text.secondary,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    marginBottom: 12,
  },
  upgradeButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 140,
    alignItems: 'center',
  },
  upgradeButtonLoading: {
    opacity: 0.7,
  },
  upgradeButtonText: {
    fontSize: 11,
    color: colors.text.inverse,
    fontFamily: 'JetBrainsMono_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Section styles
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    color: colors.text.disabled,
    fontFamily: 'JetBrainsMono_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  unlockBadge: {
    backgroundColor: colors.semantic.warningMuted,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.semantic.warningBorder,
    minWidth: 60,
    alignItems: 'center',
  },
  unlockBadgeLoading: {
    opacity: 0.7,
  },
  unlockBadgeText: {
    fontSize: 9,
    color: colors.semantic.warning,
    fontFamily: 'JetBrainsMono_700Bold',
  },
  blurredSection: {
    position: 'relative',
    minHeight: 100,
  },
  sectionBlur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface.heavy,
    borderRadius: 8,
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
    }),
  },

  // Mobile modal
  mobileModalOverlay: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mobileModal: {
    backgroundColor: colors.bg.elevated,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.medium,
    maxWidth: 320,
    width: '100%',
  },
  mobileModalTitle: {
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 8,
  },
  mobileModalText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    marginBottom: 8,
  },
  mobileModalUrl: {
    fontSize: 12,
    color: colors.accent.primary,
    fontFamily: 'JetBrainsMono_700Bold',
    marginBottom: 16,
  },
  mobileModalClose: {
    backgroundColor: colors.accent.primaryMuted,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.accent.primary,
  },
  mobileModalCloseText: {
    fontSize: 12,
    color: colors.accent.primary,
    fontFamily: 'JetBrainsMono_700Bold',
  },
});
