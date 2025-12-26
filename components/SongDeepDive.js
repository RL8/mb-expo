import { StyleSheet, Text, View, Pressable, ScrollView, Modal } from 'react-native';
import { colors, getContrastColor } from '../lib/theme';

/**
 * AudioBar - Visual bar for audio metrics
 */
function AudioBar({ label, value, color }) {
  return (
    <View style={styles.audioBarContainer}>
      <View style={styles.audioBarHeader}>
        <Text style={styles.audioBarLabel}>{label}</Text>
        <Text style={styles.audioBarValue}>{value}%</Text>
      </View>
      <View style={styles.audioBarTrack}>
        <View style={[styles.audioBarFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

/**
 * Section - Collapsible section wrapper
 */
function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/**
 * Tag - Small tag/chip component
 */
function Tag({ text, color }) {
  return (
    <View style={[styles.tag, color && { backgroundColor: color + '20', borderColor: color }]}>
      <Text style={[styles.tagText, color && { color }]}>{text}</Text>
    </View>
  );
}

/**
 * SongDeepDive - Comprehensive song information overlay
 */
export default function SongDeepDive({ visible, song, album, songs, onClose }) {
  const handleClose = () => {
    document.activeElement?.blur?.();
    onClose();
  };

  if (!song || !visible) return null;

  const textColor = getContrastColor(album?.color || '#333');

  // Calculate rankings
  const albumSongs = songs.filter(s => s.album_id === song.album_id);
  const allSongsSorted = [...songs].sort((a, b) => (b.avgEnergy || 0) - (a.avgEnergy || 0));
  const albumSongsSorted = [...albumSongs].sort((a, b) => (b.avgEnergy || 0) - (a.avgEnergy || 0));

  const overallRank = allSongsSorted.findIndex(s => s.id === song.id) + 1;
  const albumRank = albumSongsSorted.findIndex(s => s.id === song.id) + 1;
  const percentile = Math.round((1 - (overallRank - 1) / songs.length) * 100);

  // Format duration
  const minutes = Math.floor(song.totalMinutes);
  const seconds = Math.round((song.totalMinutes - minutes) * 60);
  const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Vocabulary richness
  const vocabRichness = song.wordCount > 0
    ? Math.round((song.uniqueWordCount / song.wordCount) * 100)
    : 0;

  // Format narrative voice
  const narrativeLabel = {
    'first-person': 'First Person (I/me)',
    'second-person': 'Second Person (you)',
    'third-person': 'Third Person (they/she/he)',
  }[song.narrativeVoice] || 'Unknown';

  // Format intensity
  const intensityLabel = {
    'subdued': 'Subdued',
    'moderate': 'Moderate',
    'intense': 'Intense',
    'very-intense': 'Very Intense',
  }[song.emotionalIntensity] || 'Moderate';

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={handleClose} accessibilityViewIsModal={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: album?.color }]}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                {song.vaultTracks > 0 && (
                  <View style={styles.vaultBadge}>
                    <Text style={styles.vaultBadgeText}>VAULT</Text>
                  </View>
                )}
                <Text style={[styles.trackNumber, { color: textColor }]}>
                  Track {song.trackNumber}
                </Text>
              </View>
              <Pressable style={styles.closeButton} onPress={handleClose}>
                <Text style={[styles.closeButtonText, { color: textColor }]}>×</Text>
              </Pressable>
            </View>
            <Text style={[styles.songName, { color: textColor }]} numberOfLines={2}>
              {song.name}
            </Text>
            <Text style={[styles.albumName, { color: textColor, opacity: 0.8 }]}>
              {album?.display_name}
            </Text>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Basics */}
            <Section title="BASICS">
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{duration}</Text>
                  <Text style={styles.statLabel}>Duration</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{song.wordCount.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Words</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{song.uniqueWordCount.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Unique</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{vocabRichness}%</Text>
                  <Text style={styles.statLabel}>Vocabulary</Text>
                </View>
              </View>
            </Section>

            {/* Audio Profile */}
            <Section title="AUDIO PROFILE">
              <AudioBar label="Energy" value={song.avgEnergy} color="#f59e0b" />
              <AudioBar label="Danceability" value={song.avgDanceability} color="#10b981" />
              <AudioBar label="Happiness" value={song.avgValence} color="#f472b6" />
              <AudioBar label="Acoustic" value={song.avgAcousticness} color="#6366f1" />
              <View style={styles.tempoRow}>
                <Text style={styles.tempoLabel}>Tempo</Text>
                <Text style={styles.tempoValue}>{song.avgTempo} BPM</Text>
              </View>
            </Section>

            {/* Content Analysis */}
            <Section title="CONTENT">
              {/* Themes */}
              {song.themesList && song.themesList.length > 0 && (
                <View style={styles.subsection}>
                  <Text style={styles.subsectionLabel}>Themes</Text>
                  <View style={styles.tagsContainer}>
                    {song.themesList.map((theme, idx) => (
                      <Tag key={idx} text={theme} color={album?.color} />
                    ))}
                  </View>
                </View>
              )}

              {/* Co-writers */}
              {song.coWritersList && song.coWritersList.length > 0 && (
                <View style={styles.subsection}>
                  <Text style={styles.subsectionLabel}>Co-writers</Text>
                  <View style={styles.tagsContainer}>
                    {song.coWritersList.map((writer, idx) => (
                      <Tag key={idx} text={writer} />
                    ))}
                  </View>
                </View>
              )}

              {/* Narrative & Intensity */}
              <View style={styles.contentRow}>
                <View style={styles.contentItem}>
                  <Text style={styles.contentLabel}>Narrative</Text>
                  <Text style={styles.contentValue}>{narrativeLabel}</Text>
                </View>
                <View style={styles.contentItem}>
                  <Text style={styles.contentLabel}>Intensity</Text>
                  <Text style={styles.contentValue}>{intensityLabel}</Text>
                </View>
              </View>

              {song.totalCharacters > 0 && (
                <View style={styles.contentRow}>
                  <View style={styles.contentItem}>
                    <Text style={styles.contentLabel}>Characters Mentioned</Text>
                    <Text style={styles.contentValue}>{song.totalCharacters}</Text>
                  </View>
                </View>
              )}
            </Section>

            {/* Rankings */}
            <Section title="RANKINGS">
              <View style={styles.rankingsGrid}>
                <View style={styles.rankItem}>
                  <Text style={styles.rankValue}>#{albumRank}</Text>
                  <Text style={styles.rankLabel}>in {album?.display_name}</Text>
                </View>
                <View style={styles.rankItem}>
                  <Text style={styles.rankValue}>#{overallRank}</Text>
                  <Text style={styles.rankLabel}>overall</Text>
                </View>
                <View style={styles.rankItem}>
                  <Text style={styles.rankValue}>Top {100 - percentile}%</Text>
                  <Text style={styles.rankLabel}>percentile</Text>
                </View>
              </View>
            </Section>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.bg.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    padding: 20,
    paddingTop: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vaultBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vaultBadgeText: {
    fontSize: 9,
    fontFamily: 'JetBrainsMono_700Bold',
    color: '#fff',
  },
  trackNumber: {
    fontSize: 12,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 22,
    fontFamily: 'Outfit_400Regular',
  },
  songName: {
    fontSize: 24,
    fontFamily: 'Outfit_700Bold',
    marginBottom: 4,
  },
  albumName: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.accent.primary,
    letterSpacing: 1,
    marginBottom: 12,
  },
  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface.medium,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.muted,
    marginTop: 2,
  },
  // Audio bars
  audioBarContainer: {
    marginBottom: 12,
  },
  audioBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  audioBarLabel: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: colors.text.secondary,
  },
  audioBarValue: {
    fontSize: 13,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.text.muted,
  },
  audioBarTrack: {
    height: 8,
    backgroundColor: colors.surface.medium,
    borderRadius: 4,
    overflow: 'hidden',
  },
  audioBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  tempoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface.medium,
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  tempoLabel: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    color: colors.text.secondary,
  },
  tempoValue: {
    fontSize: 15,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.primary,
  },
  // Content section
  subsection: {
    marginBottom: 16,
  },
  subsectionLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    color: colors.text.muted,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: colors.surface.medium,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
  },
  contentRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  contentItem: {
    flex: 1,
    backgroundColor: colors.surface.medium,
    borderRadius: 10,
    padding: 12,
  },
  contentLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.muted,
    marginBottom: 4,
  },
  contentValue: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
    color: colors.text.primary,
  },
  // Rankings
  rankingsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  rankItem: {
    flex: 1,
    backgroundColor: colors.surface.medium,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  rankValue: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    color: colors.accent.primary,
  },
  rankLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.muted,
    marginTop: 2,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 40,
  },
});
