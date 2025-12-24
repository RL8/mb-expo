import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = '@swiftie_profile';

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
