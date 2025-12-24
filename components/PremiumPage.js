import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { colors } from '../lib/theme';

// Web-specific imports (loaded dynamically)
let loadStripe, Elements, PaymentElement, useStripeWeb, useElements;
if (Platform.OS === 'web') {
  const stripeJs = require('@stripe/stripe-js');
  const stripeReact = require('@stripe/react-stripe-js');
  loadStripe = stripeJs.loadStripe;
  Elements = stripeReact.Elements;
  PaymentElement = stripeReact.PaymentElement;
  useStripeWeb = stripeReact.useStripe;
  useElements = stripeReact.useElements;
}

// Mobile-specific imports - disabled for now (shows fallback UI)
// Native Stripe causes bundler errors on web
let StripeProvider = null;
let useStripe = null;

const FEATURES = [
  {
    icon: '🎵',
    title: 'Similar & Different Songs',
    description: 'Discover songs that match or contrast with any track',
  },
  {
    icon: '📊',
    title: 'Deep Analytics',
    description: 'Full access to all metrics and comparisons',
  },
  {
    icon: '☁️',
    title: 'Cloud Sync',
    description: 'Your profile syncs across all devices',
  },
  {
    icon: '🚀',
    title: 'Early Access',
    description: 'Get new features before everyone else',
  },
];

// Payment Form Component (inside Elements provider)
function PaymentForm({ onSuccess }) {
  const stripe = useStripeWeb();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/?payment=success`,
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }
    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  };

  return (
    <View style={styles.paymentFormContainer}>
      <View style={styles.paymentElementWrapper}>
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </View>

      {error && (
        <View style={styles.paymentError}>
          <Text style={styles.paymentErrorText}>{error}</Text>
        </View>
      )}

      <Pressable
        style={[styles.submitButton, processing && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={processing || !stripe}
      >
        {processing ? (
          <ActivityIndicator color={colors.text.inverse} size="small" />
        ) : (
          <Text style={styles.submitButtonText}>Pay $13.13/year</Text>
        )}
      </Pressable>

      <Text style={styles.secureNote}>Secure payment powered by Stripe</Text>
    </View>
  );
}

// Web Checkout Component
function WebCheckout({ onSuccess, onClose }) {
  const [stripePromise] = useState(() =>
    loadStripe(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  );
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = useAuthStore((state) => state.user?.id);
  const userEmail = useAuthStore((state) => state.user?.email);

  useEffect(() => {
    async function createSubscription() {
      try {
        const apiBase = process.env.EXPO_PUBLIC_API_URL || '';
        const response = await fetch(`${apiBase}/api/create-subscription`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            email: userEmail,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create subscription');
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      createSubscription();
    }
  }, [userId, userEmail]);

  if (loading) {
    return (
      <View style={styles.checkoutLoading}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
        <Text style={styles.checkoutLoadingText}>Preparing checkout...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.checkoutError}>
        <Text style={styles.checkoutErrorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={() => window.location.reload()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!clientSecret) {
    return null;
  }

  const appearance = {
    theme: 'night',
    variables: {
      colorPrimary: colors.accent.primary,
      colorBackground: colors.bg.card,
      colorText: colors.text.primary,
      colorTextSecondary: colors.text.secondary,
      colorDanger: colors.semantic.error,
      fontFamily: 'Outfit, system-ui, sans-serif',
      borderRadius: '12px',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': {
        backgroundColor: colors.surface.medium,
        borderColor: colors.border.subtle,
      },
      '.Input:focus': {
        borderColor: colors.accent.primary,
      },
      '.Tab': {
        backgroundColor: colors.surface.medium,
        borderColor: colors.border.subtle,
      },
      '.Tab--selected': {
        backgroundColor: colors.accent.primaryMuted,
        borderColor: colors.accent.primary,
      },
    },
  };

  return (
    <View style={styles.checkoutContainer}>
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance,
        }}
      >
        <PaymentForm onSuccess={onSuccess} />
      </Elements>
    </View>
  );
}

// Mobile Payment Component
function MobilePayment({ onSuccess, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const userId = useAuthStore((state) => state.user?.id);

  // If Stripe Native is not available, show web fallback message
  if (!useStripe) {
    return (
      <View style={styles.mobilePaymentFallback}>
        <Text style={styles.mobilePaymentFallbackTitle}>
          Mobile Payments Coming Soon
        </Text>
        <Text style={styles.mobilePaymentFallbackText}>
          For now, please use the web version to subscribe.
        </Text>
        <Pressable style={styles.webLinkButton} onPress={onClose}>
          <Text style={styles.webLinkButtonText}>Got it</Text>
        </Pressable>
      </View>
    );
  }

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create payment intent on server
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || ''}/api/create-payment-intent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create payment');
      }

      const { clientSecret, customerId, ephemeralKey } = await response.json();

      // Initialize PaymentSheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        customerEphemeralKeySecret: ephemeralKey,
        customerId: customerId,
        merchantDisplayName: 'Swiftie Ranker',
        applePay: {
          merchantCountryCode: 'US',
        },
        googlePay: {
          merchantCountryCode: 'US',
          testEnv: true, // Set to false in production
        },
        style: 'automatic',
        appearance: {
          colors: {
            primary: colors.accent.primary,
            background: colors.bg.card,
            componentBackground: colors.surface.medium,
            componentText: colors.text.primary,
            secondaryText: colors.text.secondary,
            placeholderText: colors.text.disabled,
          },
        },
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // Present PaymentSheet
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code === 'Canceled') {
          // User cancelled - not an error
          return;
        }
        throw new Error(paymentError.message);
      }

      // Payment successful
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mobilePaymentContainer}>
      {error && (
        <View style={styles.paymentError}>
          <Text style={styles.paymentErrorText}>{error}</Text>
        </View>
      )}

      <Pressable
        style={[styles.payButton, loading && styles.payButtonDisabled]}
        onPress={handlePayment}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.text.inverse} size="small" />
        ) : (
          <Text style={styles.payButtonText}>Subscribe Now</Text>
        )}
      </Pressable>

      <Text style={styles.paymentNote}>
        Secure payment powered by Stripe
      </Text>
    </View>
  );
}

// Main Premium Page Component
export default function PremiumPage({ onClose, onSuccess }) {
  const [showCheckout, setShowCheckout] = useState(false);
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const checkSubscription = useSubscriptionStore((state) => state.checkStatus);
  const userId = useAuthStore((state) => state.user?.id);

  // If already premium, show success state
  if (isPremium) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>You're Premium!</Text>
          <Text style={styles.successText}>
            You have access to all features
          </Text>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Continue</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handlePaymentSuccess = async () => {
    // Refresh subscription status
    if (userId) {
      await checkSubscription(userId);
    }
    onSuccess?.();
  };

  // Show checkout form
  if (showCheckout) {
    const PaymentComponent = Platform.OS === 'web' ? WebCheckout : MobilePayment;

    // Wrap mobile payment with StripeProvider if available
    const content = (
      <PaymentComponent
        onSuccess={handlePaymentSuccess}
        onClose={() => setShowCheckout(false)}
      />
    );

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => setShowCheckout(false)}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Complete Payment</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {Platform.OS !== 'web' && StripeProvider ? (
            <StripeProvider
              publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}
              merchantIdentifier="merchant.com.swiftieranker"
            >
              {content}
            </StripeProvider>
          ) : (
            content
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show premium features page
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onClose}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Go Premium</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>✨</Text>
          <Text style={styles.heroTitle}>Unlock Everything</Text>
          <Text style={styles.heroSubtitle}>
            Get the full Swiftie experience
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pricing */}
        <View style={styles.pricingSection}>
          <View style={styles.pricingCard}>
            <Text style={styles.pricingLabel}>ANNUAL</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceAmount}>$13.13</Text>
              <Text style={styles.pricePeriod}>/year</Text>
            </View>
            <Text style={styles.priceNote}>That's just $1.09/month</Text>
            <Text style={styles.priceFun}>Less than a coffee ☕</Text>
          </View>
        </View>

        {/* CTA */}
        <Pressable
          style={styles.ctaButton}
          onPress={() => setShowCheckout(true)}
        >
          <Text style={styles.ctaButtonText}>Subscribe Now</Text>
        </Pressable>

        <Text style={styles.guaranteeText}>
          Cancel anytime • Secure payment
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.accent.primary,
    fontFamily: 'Outfit_600SemiBold',
  },
  headerTitle: {
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: 'Outfit_600SemiBold',
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  // Hero
  hero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 28,
    color: colors.text.primary,
    fontFamily: 'Outfit_800ExtraBold',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    fontFamily: 'Outfit_400Regular',
  },

  // Features
  featuresSection: {
    marginBottom: 32,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.medium,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  featureIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    color: colors.text.primary,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    fontFamily: 'Outfit_400Regular',
  },

  // Pricing
  pricingSection: {
    marginBottom: 24,
  },
  pricingCard: {
    backgroundColor: colors.accent.primaryMuted,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent.primary,
  },
  pricingLabel: {
    fontSize: 11,
    color: colors.accent.primary,
    fontFamily: 'JetBrainsMono_700Bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    fontSize: 42,
    color: colors.text.primary,
    fontFamily: 'Outfit_800ExtraBold',
  },
  pricePeriod: {
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: 'Outfit_400Regular',
    marginLeft: 4,
  },
  priceNote: {
    fontSize: 13,
    color: colors.text.secondary,
    fontFamily: 'Outfit_400Regular',
    marginTop: 4,
  },
  priceFun: {
    fontSize: 13,
    color: colors.accent.primary,
    fontFamily: 'Outfit_600SemiBold',
    marginTop: 8,
  },

  // CTA
  ctaButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaButtonText: {
    fontSize: 16,
    color: colors.text.inverse,
    fontFamily: 'Outfit_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  guaranteeText: {
    fontSize: 12,
    color: colors.text.muted,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
  },

  // Payment form
  paymentFormContainer: {
    flex: 1,
  },
  paymentElementWrapper: {
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    color: colors.text.inverse,
    fontFamily: 'Outfit_600SemiBold',
  },
  secureNote: {
    fontSize: 12,
    color: colors.text.muted,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
  },

  // Checkout states
  checkoutContainer: {
    flex: 1,
    minHeight: 300,
  },
  checkoutLoading: {
    padding: 40,
    alignItems: 'center',
  },
  checkoutLoadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Outfit_400Regular',
  },
  checkoutError: {
    padding: 40,
    alignItems: 'center',
  },
  checkoutErrorText: {
    fontSize: 14,
    color: colors.semantic.error,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 14,
    color: colors.text.inverse,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Mobile payment
  mobilePaymentContainer: {
    padding: 20,
    alignItems: 'center',
  },
  mobilePaymentFallback: {
    padding: 40,
    alignItems: 'center',
  },
  mobilePaymentFallbackTitle: {
    fontSize: 18,
    color: colors.text.primary,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 8,
  },
  mobilePaymentFallbackText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  webLinkButton: {
    backgroundColor: colors.accent.primaryMuted,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent.primary,
  },
  webLinkButtonText: {
    fontSize: 14,
    color: colors.accent.primary,
    fontFamily: 'Outfit_600SemiBold',
  },
  payButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 48,
    alignItems: 'center',
    marginBottom: 16,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 16,
    color: colors.text.inverse,
    fontFamily: 'Outfit_600SemiBold',
  },
  paymentNote: {
    fontSize: 12,
    color: colors.text.muted,
    fontFamily: 'Outfit_400Regular',
  },
  paymentError: {
    backgroundColor: colors.semantic.errorMuted,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  paymentErrorText: {
    fontSize: 13,
    color: colors.semantic.error,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
  },

  // Success state
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  successIcon: {
    fontSize: 64,
    color: colors.semantic.success,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    color: colors.text.primary,
    fontFamily: 'Outfit_800ExtraBold',
    marginBottom: 8,
  },
  successText: {
    fontSize: 15,
    color: colors.text.secondary,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 32,
  },
  closeButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  closeButtonText: {
    fontSize: 14,
    color: colors.text.inverse,
    fontFamily: 'Outfit_600SemiBold',
  },
});
