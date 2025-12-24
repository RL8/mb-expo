import { useRef, useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { colors, getContrastColor } from '../lib/theme';
import { saveSharedProfile } from '../lib/supabase';

/**
 * ProfileCard - Shareable Swiftie Profile
 *
 * New format:
 * - Top 3 albums with their top 3 songs each
 * - 3 lyrics (one line from #1 song of each top 3 album)
 * - App URL branding (no watermark)
 *
 * @param {object} profile - User profile data
 * @param {Array} albums - All albums
 * @param {object} songsByAlbum - Songs keyed by album ID { [albumId]: [songs] }
 * @param {function} onClose - Called when card is closed
 */
export default function ProfileCard({ profile, albums, songsByAlbum, onClose }) {
  const cardRef = useRef();
  const [shareUrl, setShareUrl] = useState(null);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreateShareLink = async () => {
    if (shareUrl) {
      // Already have a link, just copy it
      await handleCopyLink();
      return;
    }

    setIsCreatingLink(true);
    try {
      // Build the shareable profile data
      const shareData = {
        topAlbums: profile.topAlbums,
        albumSongs: profile.albumSongs,
        songLyrics: profile.songLyrics,
        // Include album and song names for display (denormalized)
        albumNames: {},
        songNames: {},
      };

      // Add album display names
      (profile.topAlbums || []).forEach(albumId => {
        const album = albums.find(a => a.id === albumId);
        if (album) {
          shareData.albumNames[albumId] = album.display_name;
          shareData.albumColors = shareData.albumColors || {};
          shareData.albumColors[albumId] = album.color;
        }
      });

      // Add song titles
      Object.entries(profile.albumSongs || {}).forEach(([albumId, songIds]) => {
        const albumSongs = songsByAlbum?.[albumId] || [];
        songIds.forEach(songId => {
          const song = albumSongs.find(s => s.id === songId);
          if (song) {
            shareData.songNames[songId] = song.name;
          }
        });
      });

      const result = await saveSharedProfile(shareData);
      if (result?.shareUrl) {
        setShareUrl(result.shareUrl);
        await Clipboard.setStringAsync(result.shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error('Error creating share link:', error);
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    await Clipboard.setStringAsync(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  // Get top 3 albums with their data
  const topAlbums = (profile.topAlbums || [])
    .slice(0, 3)
    .map(albumId => albums.find(a => a.id === albumId))
    .filter(Boolean);

  // Get songs for each album
  const getAlbumSongs = (albumId) => {
    const songIds = profile.albumSongs?.[albumId] || [];
    const albumSongs = songsByAlbum?.[albumId] || [];
    return songIds
      .map(songId => albumSongs.find(s => s.id === songId))
      .filter(Boolean);
  };

  // Get lyrics (one line from #1 song of each album)
  const getLyrics = () => {
    return topAlbums.map(album => {
      const songs = getAlbumSongs(album.id);
      const topSong = songs[0]; // #1 song
      const lyric = profile.songLyrics?.[topSong?.id];
      return {
        album,
        song: topSong,
        line: lyric || null,
      };
    }).filter(l => l.line && l.song);
  };

  const lyrics = getLyrics();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Profile</Text>
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>×</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Shareable Card */}
        <View
          ref={cardRef}
          style={styles.card}
          collapsable={false}
        >
          <Text style={styles.cardTitle}>My Swiftie Profile</Text>

          {/* Top 3 Albums with Songs */}
          {topAlbums.map((album, albumIdx) => {
            const songs = getAlbumSongs(album.id);
            const textColor = getContrastColor(album.color);

            return (
              <View key={album.id} style={styles.albumSection}>
                {/* Album header */}
                <View style={[styles.albumHeader, { backgroundColor: album.color }]}>
                  <View style={styles.albumRankBadge}>
                    <Text style={[styles.albumRankNum, { color: textColor }]}>
                      #{albumIdx + 1}
                    </Text>
                  </View>
                  <Text style={[styles.albumName, { color: textColor }]} numberOfLines={1}>
                    {album.display_name}
                  </Text>
                </View>

                {/* Songs for this album */}
                <View style={styles.songsList}>
                  {songs.map((song, songIdx) => (
                    <View key={song.id} style={styles.songItem}>
                      <View style={[styles.songRank, { backgroundColor: album.color }]}>
                        <Text style={[styles.songRankText, { color: textColor }]}>
                          {songIdx + 1}
                        </Text>
                      </View>
                      <Text style={styles.songName} numberOfLines={1}>
                        {song.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}

          {/* Lyrics section - one line from each album's #1 song */}
          {lyrics.length > 0 && (
            <View style={styles.lyricsSection}>
              <Text style={styles.sectionTitle}>FAVORITE LYRICS</Text>
              {lyrics.map(({ album, song, line }, idx) => (
                <View
                  key={`${album.id}-${song.id}`}
                  style={[styles.lyricItem, { borderLeftColor: album.color }]}
                >
                  <Text style={styles.lyricLine}>"{line}"</Text>
                  <Text style={styles.lyricAttribution}>
                    — {song.name}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Footer - App URL branding */}
          <View style={styles.cardFooter}>
            <Text style={styles.footerText}>swiftieranker.com</Text>
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        {/* Share Link Button */}
        <Pressable
          style={[styles.linkBtn, shareUrl && styles.linkBtnActive]}
          onPress={handleCreateShareLink}
          disabled={isCreatingLink}
        >
          {isCreatingLink ? (
            <ActivityIndicator size="small" color={colors.accent.primary} />
          ) : (
            <Text style={[styles.linkBtnText, shareUrl && styles.linkBtnTextActive]}>
              {copied ? 'Copied!' : shareUrl ? 'Copy Link' : 'Create Link'}
            </Text>
          )}
        </Pressable>

        {/* Share Image Button */}
        <Pressable style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>Share Image</Text>
        </Pressable>
      </View>

      {/* Show share URL if created */}
      {shareUrl && (
        <View style={styles.urlContainer}>
          <Text style={styles.urlLabel}>Your profile link:</Text>
          <Text style={styles.urlText} numberOfLines={1}>{shareUrl}</Text>
        </View>
      )}
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
    color: colors.text.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.contrast.lightOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 20,
    color: colors.text.primary,
  },
  scrollContainer: {
    flex: 1,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: colors.bg.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_800ExtraBold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 16,
  },

  // Album section styles
  albumSection: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface.medium,
  },
  albumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  albumRankBadge: {
    marginRight: 8,
  },
  albumRankNum: {
    fontSize: 12,
    fontFamily: 'JetBrainsMono_700Bold',
  },
  albumName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  songsList: {
    padding: 8,
    gap: 6,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.light,
    borderRadius: 8,
    padding: 8,
  },
  songRank: {
    width: 20,
    height: 20,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  songRankText: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_700Bold',
  },
  songName: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.primary,
  },

  // Lyrics section styles
  lyricsSection: {
    marginTop: 4,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.accent.primary,
    letterSpacing: 2,
    marginBottom: 10,
  },
  lyricItem: {
    backgroundColor: colors.surface.medium,
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  lyricLine: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    fontStyle: 'italic',
    color: colors.text.primary,
    lineHeight: 18,
  },
  lyricAttribution: {
    fontSize: 9,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.text.muted,
    marginTop: 6,
  },

  // Footer styles
  cardFooter: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  footerText: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.text.muted,
    letterSpacing: 1,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  linkBtn: {
    flex: 1,
    backgroundColor: colors.surface.medium,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  linkBtnActive: {
    borderColor: colors.accent.primaryBorder,
    backgroundColor: colors.accent.primaryMuted,
  },
  linkBtnText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  linkBtnTextActive: {
    color: colors.accent.primary,
  },
  shareBtn: {
    flex: 1,
    backgroundColor: colors.accent.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shareBtnText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.inverse,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // URL display
  urlContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 12,
    backgroundColor: colors.surface.medium,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  urlLabel: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  urlText: {
    fontSize: 12,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.accent.primary,
  },
});
