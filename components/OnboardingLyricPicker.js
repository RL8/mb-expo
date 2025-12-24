import { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { fetchSongLyrics } from '../lib/supabase';
import { colors, getContrastColor } from '../lib/theme';

/**
 * OnboardingLyricPicker - Select one lyric line from a song
 *
 * Used during onboarding to pick one favorite line from each #1 song.
 * Simpler than LyricSelector - just one tap = one line.
 *
 * @param {object} album - The album this song belongs to
 * @param {object} song - The song to pick lyrics from
 * @param {string} selectedLyric - Currently selected lyric line
 * @param {function} onLyricSelect - Called with selected line string
 * @param {function} onNext - Called when user proceeds
 * @param {function} onBack - Called to go back
 * @param {function} onSkip - Called to skip this song's lyric
 * @param {number} currentIndex - Current song index (0-2)
 * @param {number} totalSongs - Total songs to pick from (3)
 */
export default function OnboardingLyricPicker({
  album,
  song,
  selectedLyric,
  onLyricSelect,
  onNext,
  onBack,
  onSkip,
  currentIndex = 0,
  totalSongs = 3,
}) {
  const [lyrics, setLyrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLine, setSelectedLine] = useState(selectedLyric || null);

  // Load lyrics when song changes
  useEffect(() => {
    if (!song?.id) {
      setLyrics(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchSongLyrics(song.id).then(data => {
      setLyrics(data);
      setLoading(false);
    }).catch(() => {
      setLyrics(null);
      setLoading(false);
    });
  }, [song?.id]);

  // Reset selection when song changes
  useEffect(() => {
    setSelectedLine(selectedLyric || null);
  }, [song?.id, selectedLyric]);

  // Parse lyrics into lines
  const parsedLines = useMemo(() => {
    if (!lyrics?.raw_lyrics_searchable) return [];
    return lyrics.raw_lyrics_searchable
      .split('\n')
      .map((line, idx) => ({ text: line.trim(), index: idx }))
      .filter(line => line.text && !line.text.match(/^\[.*\]$/)); // Remove section headers
  }, [lyrics]);

  const handleLineTap = (lineText) => {
    if (selectedLine === lineText) {
      // Deselect
      setSelectedLine(null);
      onLyricSelect(null);
    } else {
      // Select this line
      setSelectedLine(lineText);
      onLyricSelect(lineText);
    }
  };

  const handleNext = () => {
    onNext();
  };

  const isLastSong = currentIndex === totalSongs - 1;
  const textColor = getContrastColor(album?.color || '#333');

  return (
    <View style={styles.container}>
      {/* Album/Song header */}
      <View style={[styles.header, { backgroundColor: album?.color }]}>
        <Text style={[styles.progress, { color: textColor }]}>
          Lyric {currentIndex + 1} of {totalSongs}
        </Text>
        <Text style={[styles.songTitle, { color: textColor }]} numberOfLines={1}>
          {song?.name}
        </Text>
        <Text style={[styles.albumName, { color: textColor, opacity: 0.8 }]}>
          from {album?.display_name}
        </Text>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          Tap your favorite line from this song
        </Text>
        {selectedLine && (
          <Text style={styles.selectedHint}>1 line selected</Text>
        )}
      </View>

      {/* Lyrics list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.accent.primary} />
          <Text style={styles.loadingText}>Loading lyrics...</Text>
        </View>
      ) : parsedLines.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No lyrics available</Text>
          <Pressable style={styles.skipBtn} onPress={onSkip}>
            <Text style={styles.skipBtnText}>Skip this song</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.lyricsContainer} showsVerticalScrollIndicator={false}>
          {parsedLines.map((line, idx) => {
            const isSelected = selectedLine === line.text;
            return (
              <Pressable
                key={idx}
                style={[
                  styles.lyricLine,
                  isSelected && styles.lyricLineSelected,
                  isSelected && { borderLeftColor: album?.color },
                ]}
                onPress={() => handleLineTap(line.text)}
              >
                <Text style={[
                  styles.lyricText,
                  isSelected && styles.lyricTextSelected,
                ]}>
                  {line.text}
                </Text>
                {isSelected && (
                  <View style={[styles.checkmark, { backgroundColor: album?.color }]}>
                    <Text style={[styles.checkmarkText, { color: textColor }]}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
          <View style={styles.listPadding} />
        </ScrollView>
      )}

      {/* Selected preview */}
      {selectedLine && (
        <View style={[styles.previewContainer, { borderLeftColor: album?.color }]}>
          <Text style={styles.previewLabel}>Your pick:</Text>
          <Text style={styles.previewText}>"{selectedLine}"</Text>
        </View>
      )}

      {/* Navigation */}
      <View style={styles.navigation}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>

        {!selectedLine && parsedLines.length > 0 && (
          <Pressable style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.nextButton, { backgroundColor: album?.color }]}
          onPress={handleNext}
        >
          <Text style={[styles.nextButtonText, { color: textColor }]}>
            {isLastSong ? 'Finish' : 'Next →'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  progress: {
    fontSize: 11,
    fontFamily: 'JetBrainsMono_400Regular',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  songTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 2,
  },
  albumName: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  instructions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  instructionText: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
  },
  selectedHint: {
    fontSize: 11,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.accent.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.muted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.disabled,
    marginBottom: 16,
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.surface.medium,
    borderRadius: 20,
  },
  skipBtnText: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
  },
  lyricsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  lyricLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: colors.surface.medium,
  },
  lyricLineSelected: {
    backgroundColor: colors.surface.light,
    borderLeftWidth: 3,
  },
  lyricText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
    lineHeight: 20,
  },
  lyricTextSelected: {
    color: colors.text.primary,
    fontFamily: 'Outfit_600SemiBold',
  },
  checkmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  checkmarkText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  listPadding: {
    height: 16,
  },
  previewContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surface.medium,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  previewLabel: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  previewText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    fontStyle: 'italic',
    color: colors.text.primary,
  },
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: colors.surface.medium,
  },
  skipButtonText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.muted,
  },
  nextButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 14,
    fontFamily: 'JetBrainsMono_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
