import { StyleSheet, Text, View, Pressable, ScrollView, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDataStore } from '../../stores/dataStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { colors } from '../../lib/theme';
import { BlurredSection } from '../../components/PaywallBlur';

export default function SongModal() {
  const router = useRouter();
  const { id, album: albumSlug } = useLocalSearchParams();
  const { getSongById, getAlbumById, songs, albums } = useDataStore();
  const isPremium = useSubscriptionStore((state) => state.isPremium);

  const song = getSongById(id);
  const album = song ? getAlbumById(song.album_id) : null;

  if (!song) {
    return (
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.errorText}>Song not found</Text>
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const duration = song.totalMinutes
    ? `${Math.floor(song.totalMinutes)}:${String(Math.round((song.totalMinutes % 1) * 60)).padStart(2, '0')}`
    : '--';
  const vocabRichness = song.wordCount > 0
    ? Math.round((song.uniqueWordCount / song.wordCount) * 100)
    : 0;

  // Calculate similar and different songs
  const dataKey = 'avgEnergy'; // Default metric for comparison
  const songValue = song[dataKey] || 0;
  const otherSongs = songs.filter(s => s.id !== song.id && s[dataKey] !== undefined);
  const sortedByDiff = otherSongs
    .map(s => ({ ...s, diff: Math.abs((s[dataKey] || 0) - songValue) }))
    .sort((a, b) => a.diff - b.diff);
  const mostSimilar = sortedByDiff.slice(0, 3);
  const mostDifferent = sortedByDiff.slice(-3).reverse();

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />
      <View style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.albumDot, { backgroundColor: song.color || album?.color }]} />
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={2}>{song.name}</Text>
              <Text style={styles.subtitle}>{album?.display_name || 'Unknown Album'}</Text>
            </View>
            <Pressable style={styles.close} onPress={() => router.back()}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          {/* Quick Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Stats</Text>
            <View style={styles.quickStats}>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatValue}>{duration}</Text>
                <Text style={styles.quickStatLabel}>Duration</Text>
              </View>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatValue}>{song.wordCount?.toLocaleString() || 0}</Text>
                <Text style={styles.quickStatLabel}>Words</Text>
              </View>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatValue}>{vocabRichness}%</Text>
                <Text style={styles.quickStatLabel}>Unique</Text>
              </View>
              {song.vaultTracks > 0 && (
                <View style={[styles.quickStat, styles.vaultBadge]}>
                  <Text style={styles.vaultText}>VAULT</Text>
                </View>
              )}
            </View>
          </View>

          {/* Similar Songs - Premium Feature */}
          {mostSimilar.length > 0 && (
            <BlurredSection title="Most Similar (Energy)" onNavigateToPremium={() => router.push('/premium')}>
              {mostSimilar.map((s) => {
                const sAlbum = albums.find(a => a.id === s.album_id);
                return (
                  <View key={s.id} style={styles.songRow}>
                    <View style={[styles.songDot, { backgroundColor: s.color }]} />
                    <View style={styles.songInfo}>
                      <Text style={styles.songName} numberOfLines={1}>{s.name}</Text>
                      <Text style={styles.songAlbum} numberOfLines={1}>{sAlbum?.display_name}</Text>
                    </View>
                    <Text style={styles.songValue}>{(s[dataKey] || 0).toLocaleString()}%</Text>
                  </View>
                );
              })}
            </BlurredSection>
          )}

          {/* Different Songs - Premium Feature */}
          {mostDifferent.length > 0 && (
            <BlurredSection title="Most Different (Energy)" onNavigateToPremium={() => router.push('/premium')}>
              {mostDifferent.map((s) => {
                const sAlbum = albums.find(a => a.id === s.album_id);
                return (
                  <View key={s.id} style={styles.songRow}>
                    <View style={[styles.songDot, { backgroundColor: s.color }]} />
                    <View style={styles.songInfo}>
                      <Text style={styles.songName} numberOfLines={1}>{s.name}</Text>
                      <Text style={styles.songAlbum} numberOfLines={1}>{sAlbum?.display_name}</Text>
                    </View>
                    <Text style={styles.songValue}>{(s[dataKey] || 0).toLocaleString()}%</Text>
                  </View>
                );
              })}
            </BlurredSection>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.bg.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  content: { backgroundColor: colors.bg.card, borderRadius: 20, padding: 20, maxWidth: 400, width: '100%', maxHeight: '80%', borderWidth: 1, borderColor: colors.border.medium },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  albumDot: { width: 40, height: 40, borderRadius: 8, marginRight: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 18, color: colors.text.primary, fontFamily: 'Outfit_600SemiBold', marginBottom: 2 },
  subtitle: { fontSize: 12, color: colors.text.secondary, fontFamily: 'Outfit_400Regular' },
  close: { padding: 4 },
  closeText: { fontSize: 24, color: colors.text.secondary, fontFamily: 'Outfit_300Light' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 10, color: colors.text.muted, fontFamily: 'JetBrainsMono_700Bold', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 },
  quickStats: { flexDirection: 'row', gap: 12 },
  quickStat: { backgroundColor: colors.surface.medium, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border.subtle },
  quickStatValue: { fontSize: 14, color: colors.text.primary, fontFamily: 'JetBrainsMono_700Bold' },
  quickStatLabel: { fontSize: 8, color: colors.text.muted, fontFamily: 'JetBrainsMono_400Regular', textTransform: 'uppercase', marginTop: 2 },
  vaultBadge: { backgroundColor: colors.semantic.warningMuted, borderColor: colors.semantic.warningBorder },
  vaultText: { fontSize: 10, color: colors.semantic.warning, fontFamily: 'JetBrainsMono_700Bold' },
  songRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  songDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  songInfo: { flex: 1 },
  songName: { fontSize: 13, color: colors.text.primary, fontFamily: 'Outfit_400Regular' },
  songAlbum: { fontSize: 10, color: colors.text.muted, fontFamily: 'Outfit_300Light' },
  songValue: { fontSize: 11, color: colors.accent.primary, fontFamily: 'JetBrainsMono_400Regular' },
  errorText: { fontSize: 16, color: colors.text.secondary, fontFamily: 'Outfit_400Regular', textAlign: 'center', marginBottom: 20 },
  closeButton: { backgroundColor: colors.accent.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  closeButtonText: { color: colors.text.inverse, fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
});
