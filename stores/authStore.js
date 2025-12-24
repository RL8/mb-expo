import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// Retry helper for network failures
async function withRetry(fn, maxRetries = 3, delay = 1000) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // Only retry on network errors
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

export const useAuthStore = create((set, get) => ({
  // State
  user: null,
  session: null,
  isLoading: true,
  error: null,

  // Clear error
  clearError: () => set({ error: null }),

  // Initialize auth - call once on app start
  initialize: async () => {
    try {
      set({ error: null });

      // Check for existing session with retry
      const { data: { session }, error } = await withRetry(() =>
        supabase.auth.getSession()
      );

      if (error) {
        console.error('Error getting session:', error);
        // Don't throw - try anonymous sign in
      }

      if (session) {
        set({
          session,
          user: session.user,
          isLoading: false
        });
      } else {
        // No session - sign in anonymously
        await get().signInAnonymously();
      }

      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        set({
          session,
          user: session?.user ?? null
        });

        // Handle specific events
        if (event === 'SIGNED_OUT') {
          set({ user: null, session: null });
        }
      });

      // Store subscription for cleanup if needed
      return subscription;

    } catch (error) {
      console.error('Auth initialization error:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to initialize authentication'
      });
    }
  },

  // Sign in anonymously
  signInAnonymously: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await withRetry(() =>
        supabase.auth.signInAnonymously()
      );

      if (error) {
        // Check if anonymous sign-in is not enabled
        if (error.message?.includes('Anonymous sign-ins are disabled')) {
          console.warn('Anonymous sign-ins not enabled in Supabase Dashboard');
          set({
            isLoading: false,
            error: 'Anonymous sign-ins not enabled. Please enable in Supabase Dashboard.'
          });
          return null;
        }
        throw error;
      }

      set({
        session: data.session,
        user: data.user,
        isLoading: false,
        error: null
      });

      return data;
    } catch (error) {
      console.error('Anonymous sign-in error:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to sign in'
      });
      throw error;
    }
  },

  // Link email identity (converts anonymous to permanent)
  linkEmail: async (email) => {
    const { data, error } = await supabase.auth.updateUser({ email });

    if (error) {
      console.error('Link email error:', error);
      throw error;
    }

    return data;
  },

  // Link OAuth identity (converts anonymous to permanent)
  linkOAuth: async (provider) => {
    const { data, error } = await supabase.auth.linkIdentity({ provider });

    if (error) {
      console.error('Link OAuth error:', error);
      throw error;
    }

    return data;
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }

    set({ user: null, session: null });
  },

  // Manual session update (used by auth listener)
  setSession: (session) => {
    set({
      session,
      user: session?.user ?? null
    });
  },
}));

// Selectors for common derived state
export const selectUserId = (state) => state.user?.id ?? null;
export const selectIsAnonymous = (state) => state.user?.is_anonymous ?? true;
export const selectEmail = (state) => state.user?.email ?? null;
export const selectIsAuthenticated = (state) => state.user !== null;
