import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = '@swiftie_profile';
const COMPARISONS_KEY = '@swiftie_comparisons';
const SHARE_ID_KEY = '@swiftie_share_id';
const LAST_SEEN_KEY = '@swiftie_last_seen_comparisons';
const PENDING_COMPARE_KEY = '@swiftie_pending_compare';

export async function saveProfile(profile) {
  try {
    const data = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving profile:', error);
    return false;
  }
}

export async function loadProfile() {
  try {
    const data = await AsyncStorage.getItem(PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading profile:', error);
    return null;
  }
}

export async function clearProfile() {
  try {
    await AsyncStorage.removeItem(PROFILE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing profile:', error);
    return false;
  }
}

export function createEmptyProfile() {
  return {
    topAlbums: [],
    albumSongs: {},
    songLyrics: {},
    editsUsed: {
      albums: 0,
      songs: 0,
    },
    isComplete: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================
// Share ID (cached after first share)
// ============================================

export async function saveShareId(shareId) {
  try {
    await AsyncStorage.setItem(SHARE_ID_KEY, shareId);
    return true;
  } catch (error) {
    console.error('Error saving share ID:', error);
    return false;
  }
}

export async function loadShareId() {
  try {
    return await AsyncStorage.getItem(SHARE_ID_KEY);
  } catch (error) {
    console.error('Error loading share ID:', error);
    return null;
  }
}

// ============================================
// Local Comparisons (my comparisons list)
// ============================================

export async function saveComparison(comparison) {
  try {
    const existing = await loadComparisons();
    // Update if exists, otherwise add
    const idx = existing.findIndex(c => c.shareId === comparison.shareId);
    if (idx >= 0) {
      existing[idx] = comparison;
    } else {
      existing.unshift(comparison); // Add to front (most recent)
    }
    // Keep only last 50 comparisons
    const trimmed = existing.slice(0, 50);
    await AsyncStorage.setItem(COMPARISONS_KEY, JSON.stringify(trimmed));
    return true;
  } catch (error) {
    console.error('Error saving comparison:', error);
    return false;
  }
}

export async function loadComparisons() {
  try {
    const data = await AsyncStorage.getItem(COMPARISONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading comparisons:', error);
    return [];
  }
}

export async function getComparisonCount() {
  const comparisons = await loadComparisons();
  return comparisons.length;
}

// ============================================
// Last Seen (for notification badge)
// ============================================

export async function saveLastSeenComparisons(timestamp) {
  try {
    await AsyncStorage.setItem(LAST_SEEN_KEY, timestamp);
    return true;
  } catch (error) {
    console.error('Error saving last seen:', error);
    return false;
  }
}

export async function loadLastSeenComparisons() {
  try {
    return await AsyncStorage.getItem(LAST_SEEN_KEY);
  } catch (error) {
    console.error('Error loading last seen:', error);
    return null;
  }
}

// ============================================
// Pending Comparison (deferred deep link)
// Stores the profile to compare with after onboarding
// ============================================

/**
 * Save a pending comparison to show after onboarding completes
 * @param {object} data - The shared profile data to compare with
 * @param {string} data.shareId - Share ID of the profile
 * @param {object} data.profile - The full profile data
 */
export async function savePendingComparison(data) {
  try {
    await AsyncStorage.setItem(PENDING_COMPARE_KEY, JSON.stringify({
      ...data,
      savedAt: new Date().toISOString(),
    }));
    return true;
  } catch (error) {
    console.error('Error saving pending comparison:', error);
    return false;
  }
}

/**
 * Load pending comparison (if exists)
 * @returns {Promise<{shareId: string, profile: object} | null>}
 */
export async function loadPendingComparison() {
  try {
    const data = await AsyncStorage.getItem(PENDING_COMPARE_KEY);
    if (!data) return null;

    const parsed = JSON.parse(data);

    // Expire after 24 hours
    const savedAt = new Date(parsed.savedAt);
    const now = new Date();
    const hoursDiff = (now - savedAt) / (1000 * 60 * 60);
    if (hoursDiff > 24) {
      await clearPendingComparison();
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Error loading pending comparison:', error);
    return null;
  }
}

/**
 * Clear pending comparison after it's been shown
 */
export async function clearPendingComparison() {
  try {
    await AsyncStorage.removeItem(PENDING_COMPARE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing pending comparison:', error);
    return false;
  }
}
