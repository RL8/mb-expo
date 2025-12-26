import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { colors } from '../lib/theme';

// Stripe Payment Link - Create one at https://dashboard.stripe.com/payment-links
// Use the same price ID as mbwrap: price_1SV8ZhFi04dVuDLKHNc52wVL
const CHECKOUT_URL = 'https://buy.stripe.com/test_fZe5o52dDbkQ2fS4gj'; // Replace with your actual link

export default function UpgradeModal({ visible, onClose }) {
  const handleUpgrade = () => {
    window.open(CHECKOUT_URL, '_blank');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} accessibilityViewIsModal={true}>
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessibilityLabel="Upgrade to premium dialog"
      >
        <Pressable
          style={styles.content}
          onPress={e => e.stopPropagation()}
          accessibilityRole="none"
        >
          {/* Close button */}
          <Pressable
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Text style={styles.closeBtnText}>×</Text>
          </Pressable>

          {/* Header */}
          <Text style={styles.emoji}>✨</Text>
          <Text style={styles.title}>Unlock Premium</Text>
          <Text style={styles.price}>$13.13<Text style={styles.interval}>/year</Text></Text>

          {/* Features */}
          <View style={styles.features}>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>🎯</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Similar Songs</Text>
                <Text style={styles.featureDesc}>Discover songs with matching vibes</Text>
              </View>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>↔️</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Most Different</Text>
                <Text style={styles.featureDesc}>Find songs at the opposite extremes</Text>
              </View>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>📊</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Full Analytics</Text>
                <Text style={styles.featureDesc}>Deep dive into every metric</Text>
              </View>
            </View>
          </View>

          {/* CTA */}
          <Pressable
            style={styles.upgradeBtn}
            onPress={handleUpgrade}
            accessibilityLabel="Upgrade now for $13.13 per year"
            accessibilityRole="button"
          >
            <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
          </Pressable>

          <Text style={styles.guarantee}>
            7-day money-back guarantee
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: colors.bg.card,
    borderRadius: 24,
    padding: 28,
    maxWidth: 360,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent.primaryMuted,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
  },
  closeBtnText: {
    fontSize: 24,
    color: colors.text.disabled,
    fontFamily: 'Outfit_300Light',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    color: colors.text.primary,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 8,
  },
  price: {
    fontSize: 32,
    color: colors.accent.primary,
    fontFamily: 'JetBrainsMono_700Bold',
    marginBottom: 24,
  },
  interval: {
    fontSize: 14,
    color: colors.text.muted,
  },
  features: {
    width: '100%',
    marginBottom: 24,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 32,
    textAlign: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    color: colors.text.primary,
    fontFamily: 'Outfit_600SemiBold',
  },
  featureDesc: {
    fontSize: 12,
    color: colors.text.muted,
    fontFamily: 'Outfit_400Regular',
  },
  upgradeBtn: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeBtnText: {
    fontSize: 14,
    color: colors.text.inverse,
    fontFamily: 'JetBrainsMono_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  guarantee: {
    fontSize: 11,
    color: colors.text.disabled,
    fontFamily: 'Outfit_400Regular',
  },
});
