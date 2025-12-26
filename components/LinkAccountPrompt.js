import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, ActivityIndicator, Platform } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../lib/theme';

export default function LinkAccountPrompt({ visible, onDismiss, prefillEmail = '' }) {
  const [email, setEmail] = useState(prefillEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const linkEmail = useAuthStore((state) => state.linkEmail);
  const isAnonymous = useAuthStore((state) => state.user?.is_anonymous);

  // Don't show if user already has linked identity
  if (!isAnonymous && visible) {
    onDismiss?.();
    return null;
  }

  const handleLinkEmail = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await linkEmail(email);
      setSuccess(true);
      // Auto-dismiss after success
      setTimeout(() => {
        document.activeElement?.blur?.();
        requestAnimationFrame(() => {
          onDismiss?.();
        });
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to link email');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    document.activeElement?.blur?.();
    requestAnimationFrame(() => {
      onDismiss?.();
    });
  };

  if (success) {
    return (
      <Modal visible={visible} transparent animationType="fade" accessibilityViewIsModal={true}>
        <View
          style={styles.overlay}
          accessibilityLabel="Account secured confirmation"
        >
          <View style={styles.modal}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>Account Secured!</Text>
            <Text style={styles.successText}>
              Check your email to verify your account
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
      statusBarTranslucent
      accessibilityViewIsModal={true}
    >
      <View
        style={styles.overlay}
        accessibilityLabel="Link account dialog"
      >
        <View style={styles.modal}>
          <Text style={styles.title}>Secure Your Account</Text>
          <Text style={styles.subtitle}>
            Add your email to access your subscription on any device
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={colors.text.disabled}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.linkButton, loading && styles.buttonDisabled]}
            onPress={handleLinkEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text.inverse} size="small" />
            ) : (
              <Text style={styles.linkButtonText}>Link Email</Text>
            )}
          </Pressable>

          <Pressable style={styles.skipButton} onPress={handleSkip} disabled={loading}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </Pressable>

          <Text style={styles.note}>
            You can always do this later from your profile
          </Text>
        </View>
      </View>
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
  modal: {
    backgroundColor: colors.bg.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  title: {
    fontSize: 18,
    color: colors.text.primary,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  input: {
    width: '100%',
    backgroundColor: colors.surface.medium,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: colors.text.primary,
    fontFamily: 'Outfit_400Regular',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    marginBottom: 12,
  },
  error: {
    fontSize: 12,
    color: colors.semantic.error,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 12,
    textAlign: 'center',
  },
  linkButton: {
    width: '100%',
    backgroundColor: colors.accent.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  linkButtonText: {
    fontSize: 14,
    color: colors.text.inverse,
    fontFamily: 'Outfit_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  skipButton: {
    paddingVertical: 8,
    marginBottom: 12,
  },
  skipButtonText: {
    fontSize: 13,
    color: colors.text.muted,
    fontFamily: 'Outfit_400Regular',
  },
  note: {
    fontSize: 11,
    color: colors.text.disabled,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
  },
  // Success state
  successIcon: {
    fontSize: 48,
    color: colors.semantic.success,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    color: colors.text.primary,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 8,
  },
  successText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
  },
});
