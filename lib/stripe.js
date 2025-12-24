import { loadStripe } from '@stripe/stripe-js';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Only load Stripe on web
let stripePromise = null;
if (Platform.OS === 'web') {
  stripePromise = loadStripe(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

export const getStripe = () => stripePromise;

export const PREMIUM_PRICE_ID = process.env.EXPO_PUBLIC_STRIPE_PREMIUM_PRICE_ID;

export const PREMIUM_FEATURES = {
  similarSongs: true,
  differentSongs: true,
};

// Check if user has premium access
export async function checkPremiumStatus(userId) {
  if (!userId) return false;

  const { data, error } = await supabase
    .from('subscriptions')
    .select('status, plan_type, current_period_end')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .single();

  if (error || !data) return false;

  // Check if subscription is still valid
  if (data.current_period_end) {
    const endDate = new Date(data.current_period_end);
    if (endDate < new Date()) return false;
  }

  return true;
}

// Get user's subscription details
export async function getSubscription(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

// Create checkout session URL (calls backend)
export async function createCheckoutSession(userId, priceId) {
  // For now, we'll use a simple approach - redirect to Stripe Payment Links
  // In production, you'd call your backend API to create a checkout session

  const stripe = await getStripe();
  if (!stripe) {
    throw new Error('Stripe not available on this platform');
  }

  // This would typically call your backend API
  // For demo purposes, we'll use Stripe Payment Links or a simple checkout
  const checkoutUrl = `https://buy.stripe.com/test_...`; // Replace with actual payment link

  return checkoutUrl;
}

// Open customer portal for managing subscription
export async function openCustomerPortal(userId) {
  // This would call your backend to create a portal session
  // For now, redirect to a placeholder
  const portalUrl = 'https://billing.stripe.com/p/login/test_...';
  return portalUrl;
}
