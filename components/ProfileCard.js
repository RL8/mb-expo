import { useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

export default function ProfileCard({ profile, albums, songs, onClose }) {
  const cardRef = useRef();

  const handleShare = async () => {
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your Swiftie Profile',
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Get ranked albums
  const rankedAlbums = profile.albumRanking
    .map(id => albums.find(a => a.id === id))
    .filter(Boolean);

  // Get top songs with details
  const topSongsWithDetails = profile.topSongs
    .map(({ songId, reason }) => {
      const song = songs.find(s => s.id === songId);
      const album = albums.find(a => a.id === song?.album_id);
      return { song, album, reason };
    })
    .filter(s => s.song);

  // Get lyric details
  const lyricSong = profile.favoriteLyric
    ? songs.find(s => s.id === profile.favoriteLyric.songId)
    : null;
  const lyricAlbum = lyricSong
    ? albums.find(a => a.id === lyricSong.album_id)
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Profile</Text>
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>×</Text>
        </Pressable>
      </View>

      {/* Shareable Card */}
      <View
        ref={cardRef}
        style={styles.card}
        collapsable={false}
      >
        <Text style={styles.cardTitle}>My Swiftie Profile</Text>

        {/* Album Rankings */}
        {rankedAlbums.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ALBUM RANKING</Text>
            <View style={styles.albumGrid}>
              {rankedAlbums.slice(0, 6).map((album, idx) => (
                <View key={album.id} style={styles.albumRankItem}>
                  <View style={[styles.albumColor, { backgroundColor: album.color }]}>
                    <Text style={styles.albumRankNum}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.albumRankName} numberOfLines={1}>
                    {album.display_name}
                  </Text>
                </View>
              ))}
            </View>
            {rankedAlbums.length > 6 && (
              <Text style={styles.moreText}>+{rankedAlbums.length - 6} more</Text>
            )}
          </View>
        )}

        {/* Top Songs */}
        {topSongsWithDetails.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TOP SONGS</Text>
            {topSongsWithDetails.map(({ song, album, reason }, idx) => (
              <View key={song.id} style={styles.topSongItem}>
                <View style={[styles.topSongDot, { backgroundColor: album?.color }]} />
                <View style={styles.topSongInfo}>
                  <Text style={styles.topSongName}>{song.name || song.title}</Text>
                  {reason ? (
                    <Text style={styles.topSongReason}>"{reason}"</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Favorite Lyric */}
        {profile.favoriteLyric && profile.favoriteLyric.lines?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FAVORITE LYRIC</Text>
            <View style={[styles.lyricBox, { borderLeftColor: lyricAlbum?.color || '#38bdf8' }]}>
              {profile.favoriteLyric.lines.map((line, idx) => (
                <Text key={idx} style={styles.lyricLine}>{line}</Text>
              ))}
              <Text style={styles.lyricAttribution}>
                — {lyricSong?.name || lyricSong?.title}
              </Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>swiftie.app</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>Share Profile</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    color: '#e2e8f0',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 20,
    color: '#e2e8f0',
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: 'Outfit_800ExtraBold',
    color: '#e2e8f0',
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'JetBrainsMono_700Bold',
    color: '#38bdf8',
    letterSpacing: 2,
    marginBottom: 10,
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  albumRankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
    paddingRight: 10,
    paddingVertical: 4,
    paddingLeft: 4,
  },
  albumColor: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  albumRankNum: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_700Bold',
    color: '#fff',
  },
  albumRankName: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    color: '#e2e8f0',
    maxWidth: 80,
  },
  moreText: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_400Regular',
    color: 'rgba(148, 163, 184, 0.5)',
    marginTop: 6,
  },
  topSongItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  topSongDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    marginRight: 10,
  },
  topSongInfo: {
    flex: 1,
  },
  topSongName: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: '#e2e8f0',
  },
  topSongReason: {
    fontSize: 11,
    fontFamily: 'Outfit_300Light',
    fontStyle: 'italic',
    color: 'rgba(148, 163, 184, 0.7)',
    marginTop: 2,
  },
  lyricBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    borderLeftWidth: 3,
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  lyricLine: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    fontStyle: 'italic',
    color: '#e2e8f0',
    lineHeight: 22,
  },
  lyricAttribution: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_400Regular',
    color: 'rgba(148, 163, 184, 0.6)',
    marginTop: 8,
  },
  cardFooter: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.3)',
  },
  footerText: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_400Regular',
    color: 'rgba(148, 163, 184, 0.4)',
    letterSpacing: 2,
  },
  actions: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  shareBtn: {
    backgroundColor: '#38bdf8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shareBtnText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: '#020617',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
