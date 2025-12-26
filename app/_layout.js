import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import { Stack, useRouter, usePathname, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_300Light, Outfit_400Regular, Outfit_600SemiBold, Outfit_800ExtraBold } from '@expo-google-fonts/outfit';
import { JetBrainsMono_400Regular, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../stores/authStore';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import LinkAccountPrompt from '../components/LinkAccountPrompt';
import { colors } from '../lib/theme';

// Suppress noisy dev warnings
if (__DEV__) {
  LogBox.ignoreLogs([
    'Download the React DevTools',
    'You may test your Stripe.js',
  ]);
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams();

  // Auth state
  const initialize = useAuthStore((state) => state.initialize);
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.error);
  const isAnonymous = useAuthStore((state) => state.user?.is_anonymous);

  // Subscription state
  const checkSubscription = useSubscriptionStore((state) => state.checkStatus);

  // UI state
  const [showLinkPrompt, setShowLinkPrompt] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  // Load fonts
  const [fontsLoaded] = useFonts({
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });

  // Initialize auth on app start
  useEffect(() => {
    initialize();
  }, []);

  // Check subscription when user changes
  useEffect(() => {
    if (user?.id) {
      checkSubscription(user.id);
    }
  }, [user?.id]);

  // Handle payment redirect via URL params
  useEffect(() => {
    const payment = params.payment;

    if (payment === 'success') {
      setPaymentStatus('success');
      // Refresh subscription status
      if (user?.id) {
        setTimeout(() => {
          checkSubscription(user.id);
        }, 1500);
      }
      // Show link account prompt for anonymous users
      if (isAnonymous) {
        setTimeout(() => {
          setShowLinkPrompt(true);
        }, 2000);
      }
      // Clear the payment param by navigating to clean URL
      router.replace(pathname);
    } else if (payment === 'cancelled') {
      setPaymentStatus('cancelled');
      router.replace(pathname);
      setTimeout(() => setPaymentStatus(null), 3000);
    }
  }, [params.payment, user?.id, isAnonymous, pathname]);

  // Hide splash screen when ready
  const onLayoutReady = useCallback(async () => {
    if (fontsLoaded && !authLoading) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, authLoading]);

  useEffect(() => {
    onLayoutReady();
  }, [onLayoutReady]);

  // Loading state
  if (!fontsLoaded || authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
        <StatusBar style="light" />
      </View>
    );
  }

  // Auth error state
  if (authError && !user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorText}>{authError}</Text>
        <Pressable style={styles.retryButton} onPress={() => initialize()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg.primary },
          animation: 'fade',
          // Properly manage screen lifecycle and focus
          freezeOnBlur: true,
          detachInactiveScreens: true,
          animationTypeForReplace: 'push',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="album/[slug]" />
        <Stack.Screen
          name="song/[id]"
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
          }}
        />
        <Stack.Screen name="profile" />
        <Stack.Screen name="p/[shareId]" />
        <Stack.Screen name="premium" />
        <Stack.Screen name="leaderboard" />
        <Stack.Screen name="compare" />
      </Stack>

      {/* Payment success toast */}
      {paymentStatus === 'success' && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>Payment successful! Welcome to Premium.</Text>
        </View>
      )}

      {/* Payment cancelled toast */}
      {paymentStatus === 'cancelled' && (
        <View style={[styles.toast, styles.toastWarning]}>
          <Text style={styles.toastText}>Payment cancelled</Text>
        </View>
      )}

      {/* Link account prompt */}
      <LinkAccountPrompt
        visible={showLinkPrompt}
        onDismiss={() => setShowLinkPrompt(false)}
      />

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    color: colors.text.primary,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  retryButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: 14,
    color: colors.text.inverse,
    fontFamily: 'Outfit_600SemiBold',
  },
  toast: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: colors.semantic.success,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    zIndex: 1000,
  },
  toastWarning: {
    backgroundColor: colors.semantic.warning,
  },
  toastText: {
    color: colors.text.inverse,
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
});
