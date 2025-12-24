import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';

// Premium features list
const PREMIUM_FEATURES = ['similarSongs', 'differentSongs'];

export const useSubscriptionStore = create((set, get) => ({
  // State
  isPremium: false,
  subscription: null,
  isLoading: true,
  checkoutLoading: false,

  // Check subscription status for a user
  checkStatus: async (userId) => {
    if (!userId) {
      set({ isPremium: false, subscription: null, isLoading: false });
      return;
    }

    set({ isLoading: true });

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (not an error for us)
        console.error('Error checking subscription:', error);
      }

      if (data) {
        // Check if subscription is still valid
        const isValid = data.current_period_end
          ? new Date(data.current_period_end) > new Date()
          : true;

        set({
          isPremium: isValid,
          subscription: data,
          isLoading: false
        });
      } else {
        set({
          isPremium: false,
          subscription: null,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Subscription check error:', error);
      set({ isPremium: false, subscription: null, isLoading: false });
    }
  },

  // Check if a specific feature is accessible
  canAccessFeature: (featureName) => {
    if (!PREMIUM_FEATURES.includes(featureName)) {
      return true; // Free feature
    }
    return get().isPremium;
  },

  // Open Stripe checkout
  openCheckout: async (userId) => {
    if (!userId) {
      throw new Error('User ID required for checkout');
    }

    set({ checkoutLoading: true });

    try {
      // Get API base URL - empty string for same-origin (web), or explicit URL for mobile
      const apiBase = Platform.OS === 'web' ? '' : (process.env.EXPO_PUBLIC_API_URL || '');

      const response = await fetch(`${apiBase}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      if (Platform.OS === 'web') {
        window.location.href = url;
      } else {
        const { Linking } = require('react-native');
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      throw error;
    } finally {
      set({ checkoutLoading: false });
    }
  },

  // Open Stripe Customer Portal
  openCustomerPortal: async (userId) => {
    if (!userId) {
      throw new Error('User ID required for customer portal');
    }

    try {
      const apiBase = Platform.OS === 'web' ? '' : (process.env.EXPO_PUBLIC_API_URL || '');

      const response = await fetch(`${apiBase}/api/create-portal-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create portal session');
      }

      const { url } = await response.json();

      if (Platform.OS === 'web') {
        window.location.href = url;
      } else {
        const { Linking } = require('react-native');
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Portal error:', error);
      throw error;
    }
  },

  // Reset subscription state (call on sign out)
  reset: () => {
    set({
      isPremium: false,
      subscription: null,
      isLoading: false,
      checkoutLoading: false
    });
  },
}));

// Selectors
export const selectIsPremium = (state) => state.isPremium;
export const selectIsLoading = (state) => state.isLoading;
