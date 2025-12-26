import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
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

  if (isPremium) {
    return children;
  }

  const handleUpgrade = async () => {
    try {
      await openCheckout(userId);
    } catch (err) {
      console.error('Checkout error:', err);
      // Fallback to direct link if API not set up
      window.open(CHECKOUT_URL, '_blank');
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
          Unlock similar & different songs with Premium
        </Text>
        <View style={[styles.upgradeButton, checkoutLoading && styles.upgradeButtonLoading]}>
          {checkoutLoading ? (
            <ActivityIndicator color={colors.text.inverse} size="small" />
          ) : (
            <Text style={styles.upgradeButtonText}>Upgrade · $13.13/year</Text>
          )}
        </View>
      </Pressable>
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
    try {
      await openCheckout(userId);
    } catch (error) {
      window.open(CHECKOUT_URL, '_blank');
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
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
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
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
  },
});
