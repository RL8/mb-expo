import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function fetchAlbumsWithMetrics() {
  const { data: albums, error: albumsError } = await supabase
    .from('albums')
    .select('id, display_name, color, official_release_date')
    .order('official_release_date', { ascending: true });

  if (albumsError) {
    console.error('Error fetching albums:', albumsError);
    return { albums: [], songs: [] };
  }

  const { data: songs, error: songsError } = await supabase
    .from('songs')
    .select('id, title, album_id, duration_minutes, word_count, unique_word_count, from_the_vault, audio_features, mood_profile, themes, features, narrative_voice, narrative_character_count, track_number');

  if (songsError) {
    console.error('Error fetching songs:', songsError);
    return { albums: albums.map(album => ({ ...album, songCount: 0, totalMinutes: 0, wordCount: 0 })), songs: [] };
  }

  const albumMetrics = albums.map(album => {
    const albumSongs = songs.filter(song => song.album_id === album.id);
    const songCount = albumSongs.length;

    // Basic metrics
    const totalMinutes = albumSongs.reduce((sum, song) => sum + (song.duration_minutes || 0), 0);
    const wordCount = albumSongs.reduce((sum, song) => sum + (song.word_count || 0), 0);
    const uniqueWordCount = albumSongs.reduce((sum, song) => sum + (song.unique_word_count || 0), 0);

    // Vault tracks
    const vaultTracks = albumSongs.filter(song => song.from_the_vault).length;

    // Audio features (averages)
    const songsWithAudio = albumSongs.filter(s => s.audio_features);
    const avgAudioFeature = (key) => {
      if (songsWithAudio.length === 0) return 0;
      const sum = songsWithAudio.reduce((acc, s) => acc + (s.audio_features?.[key] || 0), 0);
      return sum / songsWithAudio.length;
    };

    const avgEnergy = Math.round(avgAudioFeature('energy') * 100);
    const avgDanceability = Math.round(avgAudioFeature('danceability') * 100);
    const avgValence = Math.round(avgAudioFeature('valence') * 100);
    const avgAcousticness = Math.round(avgAudioFeature('acousticness') * 100);
    const avgTempo = Math.round(avgAudioFeature('tempo'));

    // Co-writers count
    const coWriters = new Set();
    albumSongs.forEach(song => {
      const writers = song.features?.co_writers || [];
      writers.forEach(w => coWriters.add(w));
    });
    const coWriterCount = coWriters.size;

    // Theme diversity
    const allThemes = new Set();
    albumSongs.forEach(song => {
      (song.themes || []).forEach(t => allThemes.add(t.theme));
    });
    const themeCount = allThemes.size;

    // Narrative
    const totalCharacters = albumSongs.reduce((sum, song) => sum + (song.narrative_character_count || 0), 0);
    const firstPersonCount = albumSongs.filter(s => s.narrative_voice === 'first-person').length;
    const firstPersonPct = songCount > 0 ? Math.round((firstPersonCount / songCount) * 100) : 0;

    // Mood intensity scoring
    const intensityMap = { 'subdued': 1, 'moderate': 2, 'intense': 3, 'very-intense': 4 };
    const moodScores = albumSongs
      .filter(s => s.mood_profile?.emotionalIntensity)
      .map(s => intensityMap[s.mood_profile.emotionalIntensity] || 2);
    const avgIntensity = moodScores.length > 0
      ? Math.round((moodScores.reduce((a, b) => a + b, 0) / moodScores.length) * 25)
      : 50;

    return {
      ...album,
      songCount,
      totalMinutes: Math.round(totalMinutes),
      wordCount,
      uniqueWordCount,
      vaultTracks,
      avgEnergy,
      avgDanceability,
      avgValence,
      avgAcousticness,
      avgTempo,
      coWriterCount,
      themeCount,
      totalCharacters,
      firstPersonPct,
      avgIntensity,
    };
  });

  // Process individual songs with their metrics
  const intensityMap = { 'subdued': 1, 'moderate': 2, 'intense': 3, 'very-intense': 4 };
  const processedSongs = songs.map(song => {
    const album = albums.find(a => a.id === song.album_id);
    const audio = song.audio_features || {};

    return {
      id: song.id,
      name: song.title,
      album_id: song.album_id,
      color: album?.color || '#666',
      trackNumber: song.track_number || 0,
      // Basic metrics
      totalMinutes: song.duration_minutes || 0,
      wordCount: song.word_count || 0,
      uniqueWordCount: song.unique_word_count || 0,
      // Audio (as percentages, same as album)
      avgEnergy: Math.round((audio.energy || 0) * 100),
      avgDanceability: Math.round((audio.danceability || 0) * 100),
      avgValence: Math.round((audio.valence || 0) * 100),
      avgAcousticness: Math.round((audio.acousticness || 0) * 100),
      avgTempo: Math.round(audio.tempo || 0),
      // Content
      vaultTracks: song.from_the_vault ? 1 : 0,
      coWriterCount: (song.features?.co_writers || []).length,
      themeCount: (song.themes || []).length,
      totalCharacters: song.narrative_character_count || 0,
      avgIntensity: song.mood_profile?.emotionalIntensity
        ? (intensityMap[song.mood_profile.emotionalIntensity] || 2) * 25
        : 50,
    };
  });

  return { albums: albumMetrics, songs: processedSongs };
}

export async function fetchSongLyrics(songId) {
  const { data, error } = await supabase
    .from('songs')
    .select('id, title, raw_lyrics_searchable, album_id')
    .eq('id', songId)
    .single();

  if (error) {
    console.error('Error fetching lyrics:', error);
    return null;
  }
  return data;
}

export async function fetchAllSongsBasic() {
  const { data, error } = await supabase
    .from('songs')
    .select('id, title, album_id, track_number')
    .order('track_number', { ascending: true });

  if (error) {
    console.error('Error fetching songs:', error);
    return [];
  }
  return data;
}

// ============================================
// Shared Profiles
// ============================================

/**
 * Generate a short unique ID for profile sharing
 * Uses base62 encoding for URL-friendly IDs
 */
function generateShortId(length = 8) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

/**
 * Save a profile for sharing and get a unique share ID
 * @param {object} profile - The profile data to share
 * @returns {Promise<{shareId: string, shareUrl: string} | null>}
 */
export async function saveSharedProfile(profile) {
  const shareId = generateShortId(8);

  const { error } = await supabase
    .from('shared_profiles')
    .insert({
      share_id: shareId,
      profile_data: profile,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error saving shared profile:', error);
    return null;
  }

  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://swiftieranker.com';

  return {
    shareId,
    shareUrl: `${baseUrl}/p/${shareId}`,
  };
}

/**
 * Fetch a shared profile by its share ID
 * @param {string} shareId - The unique share ID
 * @returns {Promise<object | null>}
 */
export async function fetchSharedProfile(shareId) {
  const { data, error } = await supabase
    .from('shared_profiles')
    .select('profile_data, created_at')
    .eq('share_id', shareId)
    .single();

  if (error) {
    console.error('Error fetching shared profile:', error);
    return null;
  }

  return data?.profile_data || null;
}

/**
 * Increment view count for a shared profile
 * @param {string} shareId - The unique share ID
 */
export async function incrementProfileViews(shareId) {
  await supabase.rpc('increment_profile_views', { profile_share_id: shareId });
}
