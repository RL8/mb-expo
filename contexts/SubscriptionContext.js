import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { checkPremiumStatus, getSubscription } from '../lib/stripe';

const SubscriptionContext = createContext({
  isPremium: false,
  subscription: null,
  loading: true,
  checkStatus: () => {},
});

export function SubscriptionProvider({ children, userId }) {
  const [isPremium, setIsPremium] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = async () => {
    if (!userId) {
      setIsPremium(false);
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const [hasPremium, sub] = await Promise.all([
        checkPremiumStatus(userId),
        getSubscription(userId),
      ]);
      setIsPremium(hasPremium);
      setSubscription(sub);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [userId]);

  return (
    <SubscriptionContext.Provider value={{ isPremium, subscription, loading, checkStatus }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}

// Hook to check if a specific feature is available
export function useFeatureAccess(featureName) {
  const { isPremium } = useSubscription();

  // Define which features require premium
  const premiumFeatures = ['similarSongs', 'differentSongs'];

  if (premiumFeatures.includes(featureName)) {
    return isPremium;
  }

  return true; // Free feature
}
