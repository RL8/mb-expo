import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import { colors, getContrastColor } from '../lib/theme';
import { fetchSharedProfile, incrementProfileViews, saveComparisonToSupabase, saveSharedProfile } from '../lib/supabase';
import { loadProfile, loadShareId, saveShareId, saveComparison, loadComparisons, savePendingComparison } from '../lib/storage';
import { calculateCompatibility, createComparisonRecord } from '../lib/compatibility';
import CompatibilityCard, { NoProfileCard, SharePromptCard } from './CompatibilityCard';

/**
 * SharedProfileView - Public view of a shared Swiftie Profile
 *
 * Displays a read-only version of someone's profile via share link.
 * Shows compatibility score if viewer has a profile.
 *
 * @param {string} shareId - The unique share ID from URL
 * @param {function} onClose - Called when user wants to go back
 * @param {function} onCreateProfile - Called when user wants to create profile
 * @param {function} onViewLeaderboard - Called when user wants to view leaderboard
 */
export default function SharedProfileView({ shareId, onClose, onCreateProfile, onViewLeaderboard }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Comparison state
  const [myProfile, setMyProfile] = useState(null);
  const [myShareId, setMyShareId] = useState(null);
  const [compatibility, setCompatibility] = useState(null);
  const [comparisonCount, setComparisonCount] = useState(0);
  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);

  // Load shared profile
  useEffect(() => {
    if (!shareId) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        // Load shared profile
        const data = await fetchSharedProfile(shareId);
        if (data) {
          setProfile(data);
          // Track view (fire and forget)
          incrementProfileViews(shareId);
        } else {
          setError('Profile not found');
        }

        // Load viewer's profile and share ID
        const [viewerProfile, viewerShareId, comparisons] = await Promise.all([
          loadProfile(),
          loadShareId(),
          loadComparisons(),
        ]);

        setMyProfile(viewerProfile);
        setMyShareId(viewerShareId);
        setComparisonCount(comparisons.length);

        // Calculate compatibility if viewer has a profile
        if (viewerProfile && viewerProfile.topAlbums?.length > 0 && data) {
          const result = calculateCompatibility(viewerProfile, data);
          setCompatibility(result);

          // Save comparison locally
          if (result) {
            const record = createComparisonRecord(shareId, data, result.score);
            await saveComparison(record);
            setComparisonCount(prev => prev + 1);

            // Save to Supabase if viewer has a share ID (for notifications)
            if (viewerShareId) {
              saveComparisonToSupabase(viewerShareId, shareId, result.score, {
                topAlbums: viewerProfile.topAlbums,
                albumNames: {}, // We'd need album names from somewhere
              });
            }
          }
        }
      } catch (err) {
        console.error('Error loading shared profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [shareId]);

  // Handle creating share link for viewer
  const handleCreateShareLink = async () => {
    if (!myProfile) return;

    setIsCreatingShareLink(true);
    try {
      // Build share data from profile (simplified - would need album data)
      const shareData = {
        topAlbums: myProfile.topAlbums,
        albumSongs: myProfile.albumSongs,
        songLyrics: myProfile.songLyrics,
        albumNames: {},
        albumColors: {},
        songNames: {},
      };

      const result = await saveSharedProfile(shareData);
      if (result?.shareId) {
        await saveShareId(result.shareId);
        setMyShareId(result.shareId);

        // Now save the comparison to Supabase
        if (compatibility) {
          saveComparisonToSupabase(result.shareId, shareId, compatibility.score, {
            topAlbums: myProfile.topAlbums,
          });
        }
      }
    } catch (err) {
      console.error('Error creating share link:', err);
    } finally {
      setIsCreatingShareLink(false);
    }
  };

  // Handle "Create to compare" - save pending comparison and go to onboarding
  const handleCreateToCompare = async () => {
    if (profile && shareId) {
      // Save the profile we want to compare with after onboarding
      await savePendingComparison({
        shareId,
        profile,
      });
    }
    // Navigate to profile creation
    if (onCreateProfile) {
      onCreateProfile();
    } else {
      onClose();
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>🔍</Text>
          <Text style={styles.errorTitle}>Profile Not Found</Text>
          <Text style={styles.errorText}>
            This profile link may have expired or been removed.
          </Text>
          <Pressable style={styles.homeBtn} onPress={onClose}>
            <Text style={styles.homeBtnText}>Go to Home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const topAlbums = profile.topAlbums || [];
  const albumNames = profile.albumNames || {};
  const albumColors = profile.albumColors || {};
  const albumSongs = profile.albumSongs || {};
  const songNames = profile.songNames || {};
  const songLyrics = profile.songLyrics || {};

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Swiftie Profile</Text>
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>×</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Someone's Rankings</Text>

          {/* Top Albums with Songs */}
          {topAlbums.slice(0, 3).map((albumId, albumIdx) => {
            const albumName = albumNames[albumId] || 'Unknown Album';
            const albumColor = albumColors[albumId] || '#666';
            const songs = albumSongs[albumId] || [];
            const textColor = getContrastColor(albumColor);

            return (
              <View key={albumId} style={styles.albumSection}>
                {/* Album header */}
                <View style={[styles.albumHeader, { backgroundColor: albumColor }]}>
                  <View style={styles.albumRankBadge}>
                    <Text style={[styles.albumRankNum, { color: textColor }]}>
                      #{albumIdx + 1}
                    </Text>
                  </View>
                  <Text style={[styles.albumName, { color: textColor }]} numberOfLines={1}>
                    {albumName}
                  </Text>
                </View>

                {/* Songs for this album */}
                <View style={styles.songsList}>
                  {songs.map((songId, songIdx) => (
                    <View key={songId} style={styles.songItem}>
                      <View style={[styles.songRank, { backgroundColor: albumColor }]}>
                        <Text style={[styles.songRankText, { color: textColor }]}>
                          {songIdx + 1}
                        </Text>
                      </View>
                      <Text style={styles.songName} numberOfLines={1}>
                        {songNames[songId] || 'Unknown Song'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}

          {/* Lyrics section */}
          {Object.keys(songLyrics).length > 0 && (
            <View style={styles.lyricsSection}>
              <Text style={styles.sectionTitle}>FAVORITE LYRICS</Text>
              {topAlbums.slice(0, 3).map(albumId => {
                const songs = albumSongs[albumId] || [];
                const topSongId = songs[0];
                const lyric = songLyrics[topSongId];
                if (!lyric || !topSongId) return null;

                const albumColor = albumColors[albumId] || '#666';
                const songTitle = songNames[topSongId] || 'Unknown Song';

                return (
                  <View
                    key={`lyric-${albumId}`}
                    style={[styles.lyricItem, { borderLeftColor: albumColor }]}
                  >
                    <Text style={styles.lyricLine}>"{lyric}"</Text>
                    <Text style={styles.lyricAttribution}>— {songTitle}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Footer */}
          <View style={styles.cardFooter}>
            <Text style={styles.footerText}>swiftieranker.com</Text>
          </View>
        </View>

        {/* Comparison section */}
        {myProfile && myProfile.topAlbums?.length > 0 ? (
          // User has a profile - show compatibility
          compatibility ? (
            myShareId ? (
              // Has share ID - full functionality
              <CompatibilityCard
                score={compatibility.score}
                breakdown={compatibility.breakdown}
                comparisonCount={comparisonCount}
                onViewLeaderboard={onViewLeaderboard}
              />
            ) : (
              // No share ID - prompt to create one
              <SharePromptCard
                onCreateShareLink={handleCreateShareLink}
                isLoading={isCreatingShareLink}
              />
            )
          ) : null
        ) : (
          // No profile - prompt to create
          <NoProfileCard onCreateProfile={handleCreateToCompare} />
        )}

        {/* Share encouragement for users with profiles */}
        {myProfile && myProfile.topAlbums?.length > 0 && !myShareId && (
          <View style={styles.shareEncouragement}>
            <Text style={styles.shareEncouragementText}>
              Share your profile to get more comparisons and find your best matches!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.muted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  homeBtn: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  homeBtnText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.inverse,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: 20,
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

  // Share encouragement
  shareEncouragement: {
    marginHorizontal: 20,
    marginBottom: 40,
    padding: 16,
    backgroundColor: colors.surface.medium,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  shareEncouragementText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
