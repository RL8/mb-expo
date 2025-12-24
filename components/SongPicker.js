import { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, TextInput } from 'react-native';
import { colors } from '../lib/theme';

function SongItem({ song, album, isSelected, selectionIndex, onToggle, disabled }) {
  return (
    <Pressable
      style={[
        styles.songItem,
        { borderLeftColor: album?.color || colors.fallback },
        isSelected && styles.songItemSelected,
        disabled && styles.songItemDisabled,
      ]}
      onPress={() => !disabled && onToggle(song)}
    >
      {isSelected && (
        <View style={styles.selectionBadge}>
          <Text style={styles.selectionBadgeText}>{selectionIndex}</Text>
        </View>
      )}
      <View style={styles.songInfo}>
        <Text style={[styles.songName, isSelected && styles.songNameSelected]} numberOfLines={1}>
          {song.name || song.title}
        </Text>
        <Text style={styles.albumName} numberOfLines={1}>
          {album?.display_name || 'Unknown'}
        </Text>
      </View>
      {isSelected && <Text style={styles.checkmark}>✓</Text>}
    </Pressable>
  );
}

export default function SongPicker({ albums, songs, selectedSongs, onSelectionChange, maxSongs = 3 }) {
  const [filterAlbum, setFilterAlbum] = useState(null);
  const [editingReason, setEditingReason] = useState(null);

  const filteredSongs = filterAlbum
    ? songs.filter(s => s.album_id === filterAlbum)
    : songs;

  // Sort by album then track number
  const sortedSongs = [...filteredSongs].sort((a, b) => {
    const albumA = albums.find(al => al.id === a.album_id);
    const albumB = albums.find(al => al.id === b.album_id);
    const dateA = albumA?.official_release_date || '';
    const dateB = albumB?.official_release_date || '';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return (a.trackNumber || 0) - (b.trackNumber || 0);
  });

  const handleToggleSong = (song) => {
    const existing = selectedSongs.find(s => s.songId === song.id);
    if (existing) {
      onSelectionChange(selectedSongs.filter(s => s.songId !== song.id));
    } else if (selectedSongs.length < maxSongs) {
      onSelectionChange([...selectedSongs, { songId: song.id, reason: '' }]);
    }
  };

  const handleReasonChange = (songId, reason) => {
    onSelectionChange(
      selectedSongs.map(s => s.songId === songId ? { ...s, reason } : s)
    );
  };

  const getSelectionIndex = (songId) => {
    const idx = selectedSongs.findIndex(s => s.songId === songId);
    return idx >= 0 ? idx + 1 : null;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pick Your Top {maxSongs}</Text>
      <Text style={styles.subtitle}>
        {selectedSongs.length}/{maxSongs} selected
      </Text>

      {/* Album filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        <Pressable
          style={[styles.filterChip, !filterAlbum && styles.filterChipActive]}
          onPress={() => setFilterAlbum(null)}
        >
          <Text style={[styles.filterChipText, !filterAlbum && styles.filterChipTextActive]}>
            All
          </Text>
        </Pressable>
        {albums.map(album => (
          <Pressable
            key={album.id}
            style={[
              styles.filterChip,
              { borderColor: album.color },
              filterAlbum === album.id && { backgroundColor: album.color },
            ]}
            onPress={() => setFilterAlbum(filterAlbum === album.id ? null : album.id)}
          >
            <Text
              style={[
                styles.filterChipText,
                filterAlbum === album.id && styles.filterChipTextActive,
              ]}
              numberOfLines={1}
            >
              {album.display_name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Selected songs with reasons */}
      {selectedSongs.length > 0 && (
        <View style={styles.selectedSection}>
          <Text style={styles.sectionLabel}>Your picks:</Text>
          {selectedSongs.map((selection, idx) => {
            const song = songs.find(s => s.id === selection.songId);
            const album = albums.find(a => a.id === song?.album_id);
            return (
              <View key={selection.songId} style={styles.selectedItem}>
                <View style={[styles.selectedDot, { backgroundColor: album?.color }]} />
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedName}>{song?.name || song?.title}</Text>
                  <TextInput
                    style={styles.reasonInput}
                    placeholder="Why this song? (optional)"
                    placeholderTextColor={colors.text.disabled}
                    value={selection.reason}
                    onChangeText={(text) => handleReasonChange(selection.songId, text)}
                    maxLength={100}
                  />
                </View>
                <Pressable onPress={() => handleToggleSong(song)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>×</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* Song list */}
      <ScrollView style={styles.songList} showsVerticalScrollIndicator={false}>
        {sortedSongs.map(song => {
          const album = albums.find(a => a.id === song.album_id);
          const isSelected = selectedSongs.some(s => s.songId === song.id);
          const selectionIndex = getSelectionIndex(song.id);
          const disabled = !isSelected && selectedSongs.length >= maxSongs;

          return (
            <SongItem
              key={song.id}
              song={song}
              album={album}
              isSelected={isSelected}
              selectionIndex={selectionIndex}
              onToggle={handleToggleSong}
              disabled={disabled}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.accent.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    maxHeight: 36,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.surface.medium,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  filterChipText: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.text.secondary,
    textTransform: 'uppercase',
  },
  filterChipTextActive: {
    color: colors.text.inverse,
  },
  selectedSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.medium,
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  reasonInput: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.primary,
    padding: 0,
  },
  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    fontSize: 16,
    color: colors.semantic.error,
  },
  songList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.light,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderLeftWidth: 3,
  },
  songItemSelected: {
    backgroundColor: colors.interactive.hover,
    borderColor: colors.accent.primary,
  },
  songItemDisabled: {
    opacity: 0.4,
  },
  selectionBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  selectionBadgeText: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.inverse,
  },
  songInfo: {
    flex: 1,
  },
  songName: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
  },
  songNameSelected: {
    color: colors.accent.primary,
  },
  albumName: {
    fontSize: 10,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
  },
  checkmark: {
    fontSize: 14,
    color: colors.accent.primary,
    marginLeft: 8,
  },
});
