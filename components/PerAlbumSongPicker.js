import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { colors, getContrastColor, getBadgeBackground, getBadgeTextColor } from '../lib/theme';

/**
 * PerAlbumSongPicker - Select top 3 songs from each album
 *
 * Shown during onboarding after album selection. Users pick 3 songs per album.
 * Selection order = ranking order.
 *
 * @param {object} album - Current album being picked for
 * @param {Array} songs - Songs for this album
 * @param {Array} selectedSongs - Currently selected song IDs (ordered)
 * @param {function} onSelectionChange - Called with new selection array
 * @param {function} onNext - Called when user is done with this album
 * @param {function} onBack - Called to go back to previous album
 * @param {number} currentAlbumIndex - Current album index (0-2)
 * @param {number} totalAlbums - Total albums to pick from (3)
 * @param {boolean} isEditing - Whether user is editing existing selection
 * @param {number} editsRemaining - Number of edits remaining (0 = locked)
 */
export default function PerAlbumSongPicker({
  album,
  songs,
  selectedSongs = [],
  onSelectionChange,
  onNext,
  onBack,
  currentAlbumIndex = 0,
  totalAlbums = 3,
  isEditing = false,
  editsRemaining = 1,
}) {
  const { width: windowWidth } = useWindowDimensions();
  const padding = 16;

  const handleSongTap = (songId) => {
    const currentIndex = selectedSongs.indexOf(songId);

    if (currentIndex >= 0) {
      // Already selected - remove it
      onSelectionChange(selectedSongs.filter(id => id !== songId));
    } else if (selectedSongs.length < 3) {
      // Add to selection
      onSelectionChange([...selectedSongs, songId]);
    }
    // If already have 3, ignore tap on unselected songs
  };

  const getRank = (songId) => {
    const idx = selectedSongs.indexOf(songId);
    return idx >= 0 ? idx + 1 : null;
  };

  // Sort songs by track number
  const sortedSongs = useMemo(() => {
    return [...songs].sort((a, b) => (a.track_number || 0) - (b.track_number || 0));
  }, [songs]);

  const canProceed = selectedSongs.length === 3;
  const isLastAlbum = currentAlbumIndex === totalAlbums - 1;

  return (
    <View style={styles.container}>
      {/* Album header */}
      <View style={[styles.albumHeader, { backgroundColor: album.color }]}>
        <Text style={[styles.albumProgress, { color: getContrastColor(album.color) }]}>
          Album {currentAlbumIndex + 1} of {totalAlbums}
        </Text>
        <Text style={[styles.albumName, { color: getContrastColor(album.color) }]}>
          {album.display_name}
        </Text>
        <Text style={[styles.instruction, { color: getContrastColor(album.color), opacity: 0.8 }]}>
          Pick your top 3 songs
        </Text>
      </View>

      {/* Edit warning */}
      {isEditing && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            {editsRemaining > 0
              ? `This is your ${editsRemaining === 1 ? 'one remaining' : 'free'} edit. After this, subscribe for more changes.`
              : 'Subscribe to change your selection.'}
          </Text>
        </View>
      )}

      {/* Selection status */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {selectedSongs.length}/3 selected
        </Text>
        {selectedSongs.length > 0 && (
          <Pressable onPress={() => onSelectionChange([])}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        )}
      </View>

      {/* Song list */}
      <ScrollView style={styles.songList} showsVerticalScrollIndicator={false}>
        {sortedSongs.map((song) => {
          const rank = getRank(song.id);
          const isSelected = rank !== null;
          const isDisabled = !isSelected && selectedSongs.length >= 3;

          return (
            <Pressable
              key={song.id}
              style={[
                styles.songItem,
                isSelected && styles.songItemSelected,
                isDisabled && styles.songItemDisabled,
              ]}
              onPress={() => handleSongTap(song.id)}
            >
              {/* Track number or rank */}
              <View style={[
                styles.numberBadge,
                isSelected && { backgroundColor: album.color }
              ]}>
                <Text style={[
                  styles.numberText,
                  isSelected && { color: getContrastColor(album.color) }
                ]}>
                  {isSelected ? rank : song.track_number || '–'}
                </Text>
              </View>

              {/* Song info */}
              <View style={styles.songInfo}>
                <Text style={[
                  styles.songName,
                  isSelected && styles.songNameSelected
                ]} numberOfLines={1}>
                  {song.title}
                </Text>
                {song.is_vault_track && (
                  <Text style={styles.vaultBadge}>VAULT</Text>
                )}
              </View>

              {/* Selection indicator */}
              {isSelected && (
                <View style={[styles.checkmark, { backgroundColor: album.color }]}>
                  <Text style={[styles.checkmarkText, { color: getContrastColor(album.color) }]}>✓</Text>
                </View>
              )}
            </Pressable>
          );
        })}
        <View style={styles.listPadding} />
      </ScrollView>

      {/* Selection preview */}
      {selectedSongs.length > 0 && (
        <View style={styles.selectionPreview}>
          <Text style={styles.selectionLabel}>Your ranking:</Text>
          <View style={styles.selectionRow}>
            {selectedSongs.map((songId, idx) => {
              const song = songs.find(s => s.id === songId);
              return (
                <View key={songId} style={styles.selectionItem}>
                  <View style={[styles.selectionDot, { backgroundColor: album.color }]}>
                    <Text style={[styles.selectionNum, { color: getContrastColor(album.color) }]}>
                      {idx + 1}
                    </Text>
                  </View>
                  <Text style={styles.selectionName} numberOfLines={1}>
                    {song?.title}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Navigation buttons */}
      <View style={styles.navigation}>
        {currentAlbumIndex > 0 && (
          <Pressable style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
        )}
        <Pressable
          style={[
            styles.nextButton,
            !canProceed && styles.nextButtonDisabled,
            currentAlbumIndex === 0 && styles.nextButtonFull,
          ]}
          onPress={onNext}
          disabled={!canProceed}
        >
          <Text style={[
            styles.nextButtonText,
            !canProceed && styles.nextButtonTextDisabled
          ]}>
            {isLastAlbum ? 'Finish' : 'Next Album →'}
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
  albumHeader: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  albumProgress: {
    fontSize: 11,
    fontFamily: 'JetBrainsMono_400Regular',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  albumName: {
    fontSize: 24,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 4,
  },
  instruction: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.semantic.warningMuted,
    borderWidth: 1,
    borderColor: colors.semantic.warningBorder,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: colors.semantic.warning,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.accent.primary,
  },
  clearText: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.muted,
  },
  songList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.medium,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  songItemSelected: {
    backgroundColor: colors.surface.light,
    borderColor: colors.accent.primary,
    borderWidth: 2,
  },
  songItemDisabled: {
    opacity: 0.4,
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.surface.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  numberText: {
    fontSize: 12,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.muted,
  },
  songInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  songName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.primary,
  },
  songNameSelected: {
    fontFamily: 'Outfit_600SemiBold',
  },
  vaultBadge: {
    fontSize: 9,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.accent.vault,
    backgroundColor: colors.accent.vaultMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  checkmarkText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  listPadding: {
    height: 16,
  },
  selectionPreview: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface.medium,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  selectionLabel: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  selectionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.light,
    borderRadius: 8,
    padding: 8,
  },
  selectionDot: {
    width: 20,
    height: 20,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  selectionNum: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 10,
  },
  selectionName: {
    flex: 1,
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
    color: colors.text.primary,
  },
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
  },
  nextButton: {
    flex: 1,
    backgroundColor: colors.accent.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonDisabled: {
    backgroundColor: colors.surface.medium,
  },
  nextButtonText: {
    fontSize: 14,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.inverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextButtonTextDisabled: {
    color: colors.text.muted,
  },
});
