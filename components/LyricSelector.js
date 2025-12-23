import { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { fetchSongLyrics } from '../lib/supabase';

function parseLyrics(raw) {
  if (!raw) return [];
  return raw
    .split('\n')
    .map((line, idx) => ({ text: line.trim(), originalIndex: idx }))
    .filter(line => line.text && !line.text.match(/^\[.*\]$/));
}

export default function LyricSelector({ albums, songs, selectedLyric, onLyricSelect }) {
  const [selectedSongId, setSelectedSongId] = useState(selectedLyric?.songId || null);
  const [lyrics, setLyrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState({
    startIndex: selectedLyric?.startIndex ?? null,
    endIndex: selectedLyric?.endIndex ?? null,
  });

  const MAX_LINES = 4;

  // Load lyrics when song is selected
  useEffect(() => {
    if (!selectedSongId) {
      setLyrics(null);
      return;
    }

    setLoading(true);
    fetchSongLyrics(selectedSongId).then(data => {
      setLyrics(data);
      setLoading(false);
    });
  }, [selectedSongId]);

  const parsedLines = useMemo(() => {
    if (!lyrics?.raw_lyrics_searchable) return [];
    return parseLyrics(lyrics.raw_lyrics_searchable);
  }, [lyrics]);

  const handleLineTap = (lineIndex) => {
    if (selection.startIndex === null) {
      // First selection
      setSelection({ startIndex: lineIndex, endIndex: lineIndex });
    } else if (lineIndex === selection.startIndex && lineIndex === selection.endIndex) {
      // Tapped same line - deselect
      setSelection({ startIndex: null, endIndex: null });
    } else {
      // Extend or contract selection
      const newStart = Math.min(selection.startIndex, lineIndex);
      const newEnd = Math.max(selection.endIndex, lineIndex);

      if (newEnd - newStart < MAX_LINES) {
        // Check if consecutive
        const isAdjacent = lineIndex === selection.startIndex - 1 ||
                          lineIndex === selection.endIndex + 1 ||
                          (lineIndex >= selection.startIndex && lineIndex <= selection.endIndex);

        if (isAdjacent || lineIndex >= selection.startIndex && lineIndex <= selection.endIndex) {
          setSelection({ startIndex: newStart, endIndex: newEnd });
        } else {
          // Non-adjacent - start new selection
          setSelection({ startIndex: lineIndex, endIndex: lineIndex });
        }
      } else {
        // Would exceed max - start new selection
        setSelection({ startIndex: lineIndex, endIndex: lineIndex });
      }
    }
  };

  // Update parent when selection changes
  useEffect(() => {
    if (selection.startIndex !== null && selectedSongId) {
      const selectedLines = parsedLines
        .slice(selection.startIndex, selection.endIndex + 1)
        .map(l => l.text);

      onLyricSelect({
        songId: selectedSongId,
        lines: selectedLines,
        startIndex: selection.startIndex,
        endIndex: selection.endIndex,
      });
    } else if (selection.startIndex === null) {
      onLyricSelect(null);
    }
  }, [selection, selectedSongId, parsedLines]);

  const isLineSelected = (idx) => {
    if (selection.startIndex === null) return false;
    return idx >= selection.startIndex && idx <= selection.endIndex;
  };

  const selectionCount = selection.startIndex !== null
    ? selection.endIndex - selection.startIndex + 1
    : 0;

  // Group songs by album for the picker
  const songsByAlbum = useMemo(() => {
    const grouped = {};
    albums.forEach(album => {
      grouped[album.id] = {
        album,
        songs: songs.filter(s => s.album_id === album.id)
          .sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0)),
      };
    });
    return Object.values(grouped).filter(g => g.songs.length > 0);
  }, [albums, songs]);

  // Song picker view
  if (!selectedSongId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Choose Your Favorite Lyric</Text>
        <Text style={styles.subtitle}>First, pick a song</Text>

        <ScrollView style={styles.songPicker} showsVerticalScrollIndicator={false}>
          {songsByAlbum.map(({ album, songs: albumSongs }) => (
            <View key={album.id} style={styles.albumGroup}>
              <View style={styles.albumHeader}>
                <View style={[styles.albumDot, { backgroundColor: album.color }]} />
                <Text style={styles.albumTitle}>{album.display_name}</Text>
              </View>
              {albumSongs.map(song => (
                <Pressable
                  key={song.id}
                  style={styles.songPickerItem}
                  onPress={() => setSelectedSongId(song.id)}
                >
                  <Text style={styles.songPickerName}>{song.name || song.title}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Lyric selection view
  const song = songs.find(s => s.id === selectedSongId);
  const album = albums.find(a => a.id === song?.album_id);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your Lines</Text>
      <Text style={styles.subtitle}>
        Tap to select (max {MAX_LINES} consecutive) · {selectionCount}/{MAX_LINES}
      </Text>

      {/* Song header */}
      <View style={styles.songHeader}>
        <View style={[styles.albumDot, { backgroundColor: album?.color }]} />
        <View style={styles.songHeaderInfo}>
          <Text style={styles.songHeaderName}>{song?.name || song?.title}</Text>
          <Text style={styles.songHeaderAlbum}>{album?.display_name}</Text>
        </View>
        <Pressable style={styles.changeSongBtn} onPress={() => {
          setSelectedSongId(null);
          setSelection({ startIndex: null, endIndex: null });
        }}>
          <Text style={styles.changeSongBtnText}>Change</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#38bdf8" />
          <Text style={styles.loadingText}>Loading lyrics...</Text>
        </View>
      ) : parsedLines.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No lyrics available for this song</Text>
        </View>
      ) : (
        <ScrollView style={styles.lyricsContainer} showsVerticalScrollIndicator={false}>
          {parsedLines.map((line, idx) => {
            const selected = isLineSelected(idx);
            return (
              <Pressable
                key={idx}
                style={[styles.lyricLine, selected && styles.lyricLineSelected]}
                onPress={() => handleLineTap(idx)}
              >
                <Text style={[styles.lyricText, selected && styles.lyricTextSelected]}>
                  {line.text}
                </Text>
              </Pressable>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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
    color: '#e2e8f0',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'JetBrainsMono_400Regular',
    color: '#38bdf8',
    textAlign: 'center',
    marginBottom: 16,
  },
  songPicker: {
    flex: 1,
    paddingHorizontal: 16,
  },
  albumGroup: {
    marginBottom: 16,
  },
  albumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  albumDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  albumTitle: {
    fontSize: 12,
    fontFamily: 'JetBrainsMono_700Bold',
    color: 'rgba(148, 163, 184, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  songPickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 8,
    marginBottom: 4,
    marginLeft: 18,
  },
  songPickerName: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: '#e2e8f0',
  },
  songHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  songHeaderInfo: {
    flex: 1,
    marginLeft: 4,
  },
  songHeaderName: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: '#e2e8f0',
  },
  songHeaderAlbum: {
    fontSize: 10,
    fontFamily: 'Outfit_400Regular',
    color: 'rgba(148, 163, 184, 0.6)',
  },
  changeSongBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 8,
  },
  changeSongBtnText: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_700Bold',
    color: '#38bdf8',
    textTransform: 'uppercase',
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
    color: 'rgba(148, 163, 184, 0.6)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: 'rgba(148, 163, 184, 0.5)',
  },
  lyricsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  lyricLine: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 2,
  },
  lyricLineSelected: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: '#38bdf8',
  },
  lyricText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: 'rgba(226, 232, 240, 0.8)',
    lineHeight: 22,
  },
  lyricTextSelected: {
    color: '#38bdf8',
    fontFamily: 'Outfit_600SemiBold',
  },
});
