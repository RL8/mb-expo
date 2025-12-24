import { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AlbumSelector from './AlbumSelector';
import PerAlbumSongPicker from './PerAlbumSongPicker';
import OnboardingLyricPicker from './OnboardingLyricPicker';
import ProfileCard from './ProfileCard';
import { saveProfile, loadProfile } from '../lib/storage';
import { colors } from '../lib/theme';

/**
 * ProfileBuilder - Onboarding flow for creating Swiftie profile
 *
 * Flow:
 * 1. AlbumSelector - Pick top 3 albums (tap to select, order = ranking)
 * 2. PerAlbumSongPicker x3 - For each album, pick top 3 songs
 * 3. OnboardingLyricPicker x3 - For each #1 song, pick one lyric line
 * 4. ProfileCard - View and share the profile
 *
 * Features:
 * - Skip at any time (saves progress)
 * - Resume incomplete profile
 * - Edit tracking for free tier limits
 *
 * Data shape:
 * {
 *   topAlbums: [albumId, albumId, albumId],
 *   albumSongs: { [albumId]: [songId, songId, songId] },
 *   songLyrics: { [songId]: "lyric line" },
 *   editsUsed: { albums: 0, songs: 0 },
 *   isComplete: boolean,
 * }
 */

const createEmptyProfile = () => ({
  topAlbums: [],
  albumSongs: {},
  songLyrics: {},
  editsUsed: {
    albums: 0,
    songs: 0,
  },
  isComplete: false,
});

// Check if profile has minimum required data
const isProfileComplete = (profile) => {
  if (!profile.topAlbums || profile.topAlbums.length !== 3) return false;

  // Check all albums have 3 songs
  for (const albumId of profile.topAlbums) {
    if (!profile.albumSongs?.[albumId] || profile.albumSongs[albumId].length !== 3) {
      return false;
    }
  }

  return true;
};

// Get the next incomplete step
const getIncompleteStep = (profile) => {
  if (!profile.topAlbums || profile.topAlbums.length < 3) {
    return { step: 'albums', index: 0 };
  }

  for (let i = 0; i < profile.topAlbums.length; i++) {
    const albumId = profile.topAlbums[i];
    if (!profile.albumSongs?.[albumId] || profile.albumSongs[albumId].length < 3) {
      return { step: 'songs', index: i };
    }
  }

  // All songs selected, check lyrics (optional but part of flow)
  for (let i = 0; i < profile.topAlbums.length; i++) {
    const albumId = profile.topAlbums[i];
    const topSongId = profile.albumSongs?.[albumId]?.[0];
    if (topSongId && !profile.songLyrics?.[topSongId]) {
      return { step: 'lyrics', index: i };
    }
  }

  return { step: 'preview', index: 0 };
};

export default function ProfileBuilder({ albums, songs, onClose }) {
  const [step, setStep] = useState('albums'); // 'albums' | 'songs' | 'lyrics' | 'preview'
  const [currentIndex, setCurrentIndex] = useState(0); // For songs (0-2) and lyrics (0-2)
  const [profile, setProfile] = useState(createEmptyProfile());
  const [isEditing, setIsEditing] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  // Load saved profile on mount
  useEffect(() => {
    loadProfile().then(saved => {
      if (saved && saved.topAlbums?.length > 0) {
        setProfile(saved);

        if (saved.isComplete) {
          // Complete profile - go to preview
          setIsEditing(true);
          setStep('preview');
        } else {
          // Incomplete - show resume prompt
          setShowResumePrompt(true);
        }
      }
    });
  }, []);

  // Auto-save when profile changes
  useEffect(() => {
    if (profile.topAlbums.length > 0) {
      saveProfile(profile);
    }
  }, [profile]);

  // Group songs by album for easy lookup
  const songsByAlbum = useMemo(() => {
    const grouped = {};
    songs.forEach(song => {
      if (!grouped[song.album_id]) {
        grouped[song.album_id] = [];
      }
      grouped[song.album_id].push(song);
    });
    return grouped;
  }, [songs]);

  // Get selected albums in order
  const selectedAlbums = useMemo(() => {
    return profile.topAlbums
      .map(albumId => albums.find(a => a.id === albumId))
      .filter(Boolean);
  }, [profile.topAlbums, albums]);

  // Current album for song/lyric selection
  const currentAlbum = selectedAlbums[currentIndex];

  // Get the #1 song for current album (for lyric selection)
  const currentTopSong = useMemo(() => {
    if (!currentAlbum) return null;
    const topSongId = profile.albumSongs?.[currentAlbum.id]?.[0];
    if (!topSongId) return null;
    return songsByAlbum[currentAlbum.id]?.find(s => s.id === topSongId);
  }, [currentAlbum, profile.albumSongs, songsByAlbum]);

  // Calculate edits remaining
  const albumEditsRemaining = 1 - (profile.editsUsed?.albums || 0);
  const songEditsRemaining = 1 - (profile.editsUsed?.songs || 0);

  // Resume from incomplete step
  const handleResume = () => {
    const { step: incompleteStep, index } = getIncompleteStep(profile);
    setStep(incompleteStep);
    setCurrentIndex(index);
    setShowResumePrompt(false);
  };

  // Start fresh
  const handleStartFresh = () => {
    setProfile(createEmptyProfile());
    setStep('albums');
    setCurrentIndex(0);
    setShowResumePrompt(false);
    setIsEditing(false);
  };

  // Skip/Save & Exit
  const handleSkip = () => {
    saveProfile(profile);
    onClose();
  };

  // Album selection handlers
  const handleAlbumSelectionChange = (selectedAlbumIds) => {
    setProfile(prev => ({
      ...prev,
      topAlbums: selectedAlbumIds,
      // Clear songs for removed albums
      albumSongs: Object.fromEntries(
        Object.entries(prev.albumSongs || {}).filter(
          ([albumId]) => selectedAlbumIds.includes(albumId)
        )
      ),
      isComplete: false,
    }));
  };

  const handleAlbumSelectionComplete = () => {
    if (profile.topAlbums.length === 3) {
      setCurrentIndex(0);
      setStep('songs');
      if (isEditing) {
        setProfile(prev => ({
          ...prev,
          editsUsed: {
            ...prev.editsUsed,
            albums: (prev.editsUsed?.albums || 0) + 1,
          },
        }));
      }
    }
  };

  // Song selection handlers
  const handleSongSelectionChange = (selectedSongIds) => {
    if (!currentAlbum) return;
    setProfile(prev => ({
      ...prev,
      albumSongs: {
        ...prev.albumSongs,
        [currentAlbum.id]: selectedSongIds,
      },
      isComplete: false,
    }));
  };

  const handleSongAlbumNext = () => {
    if (currentIndex < 2) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All songs selected - move to lyrics
      setCurrentIndex(0);
      setStep('lyrics');
      if (isEditing) {
        setProfile(prev => ({
          ...prev,
          editsUsed: {
            ...prev.editsUsed,
            songs: (prev.editsUsed?.songs || 0) + 1,
          },
        }));
      }
    }
  };

  const handleSongAlbumBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setStep('albums');
    }
  };

  // Lyric selection handlers
  const handleLyricSelect = (lyricLine) => {
    if (!currentTopSong) return;
    setProfile(prev => ({
      ...prev,
      songLyrics: {
        ...prev.songLyrics,
        [currentTopSong.id]: lyricLine,
      },
    }));
  };

  const handleLyricNext = () => {
    if (currentIndex < 2) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All lyrics done - mark complete and go to preview
      setProfile(prev => ({
        ...prev,
        isComplete: true,
      }));
      setStep('preview');
    }
  };

  const handleLyricBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setStep('songs');
      setCurrentIndex(2); // Go to last album's songs
    }
  };

  const handleLyricSkip = () => {
    // Clear any selected lyric for this song and move on
    if (currentTopSong) {
      setProfile(prev => {
        const newLyrics = { ...prev.songLyrics };
        delete newLyrics[currentTopSong.id];
        return { ...prev, songLyrics: newLyrics };
      });
    }
    handleLyricNext();
  };

  // General back handler
  const handleBack = () => {
    if (step === 'preview') {
      setStep('lyrics');
      setCurrentIndex(2);
    } else if (step === 'lyrics') {
      handleLyricBack();
    } else if (step === 'songs') {
      handleSongAlbumBack();
    } else {
      onClose();
    }
  };

  // Calculate progress (8 steps total: 1 album + 3 songs + 3 lyrics + 1 preview)
  const getTotalSteps = () => 8;
  const getCurrentStepIndex = () => {
    if (step === 'albums') return 0;
    if (step === 'songs') return 1 + currentIndex;
    if (step === 'lyrics') return 4 + currentIndex;
    return 7; // preview
  };

  // Resume prompt overlay
  if (showResumePrompt) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.resumePrompt}>
            <Text style={styles.resumeIcon}>📝</Text>
            <Text style={styles.resumeTitle}>Continue Your Profile?</Text>
            <Text style={styles.resumeSubtitle}>
              You have an incomplete profile. Would you like to continue where you left off?
            </Text>

            <Pressable style={styles.resumeBtn} onPress={handleResume}>
              <Text style={styles.resumeBtnText}>Continue</Text>
            </Pressable>

            <Pressable style={styles.startFreshBtn} onPress={handleStartFresh}>
              <Text style={styles.startFreshBtnText}>Start Fresh</Text>
            </Pressable>

            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backBtnText}>
              {step === 'albums' && !isEditing ? '×' : '←'}
            </Text>
          </Pressable>

          {/* Progress indicator */}
          <View style={styles.stepIndicators}>
            {Array.from({ length: getTotalSteps() }).map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.stepDot,
                  idx === getCurrentStepIndex() && styles.stepDotActive,
                  idx < getCurrentStepIndex() && styles.stepDotComplete,
                ]}
              />
            ))}
          </View>

          {/* Skip button */}
          {step !== 'preview' && (
            <Pressable style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.skipBtnText}>Save & Exit</Text>
            </Pressable>
          )}

          {step === 'preview' && (
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>×</Text>
            </Pressable>
          )}
        </View>

        {/* Step content */}
        <View style={styles.content}>
          {step === 'albums' && (
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <AlbumSelector
                albums={albums}
                selectedAlbums={profile.topAlbums}
                onSelectionChange={handleAlbumSelectionChange}
                isEditing={isEditing && profile.editsUsed?.albums === 0}
                editsRemaining={albumEditsRemaining}
              />

              <View style={styles.continueContainer}>
                <Pressable
                  style={[
                    styles.continueBtn,
                    profile.topAlbums.length < 3 && styles.continueBtnDisabled,
                  ]}
                  onPress={handleAlbumSelectionComplete}
                  disabled={profile.topAlbums.length < 3}
                >
                  <Text style={[
                    styles.continueBtnText,
                    profile.topAlbums.length < 3 && styles.continueBtnTextDisabled,
                  ]}>
                    Continue to Songs →
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          )}

          {step === 'songs' && currentAlbum && (
            <PerAlbumSongPicker
              album={currentAlbum}
              songs={songsByAlbum[currentAlbum.id] || []}
              selectedSongs={profile.albumSongs?.[currentAlbum.id] || []}
              onSelectionChange={handleSongSelectionChange}
              onNext={handleSongAlbumNext}
              onBack={handleSongAlbumBack}
              currentAlbumIndex={currentIndex}
              totalAlbums={3}
              isEditing={isEditing && profile.editsUsed?.songs === 0}
              editsRemaining={songEditsRemaining}
            />
          )}

          {step === 'lyrics' && currentAlbum && currentTopSong && (
            <OnboardingLyricPicker
              album={currentAlbum}
              song={currentTopSong}
              selectedLyric={profile.songLyrics?.[currentTopSong.id]}
              onLyricSelect={handleLyricSelect}
              onNext={handleLyricNext}
              onBack={handleLyricBack}
              onSkip={handleLyricSkip}
              currentIndex={currentIndex}
              totalSongs={3}
            />
          )}

          {step === 'preview' && (
            <ProfileCard
              profile={profile}
              albums={albums}
              songsByAlbum={songsByAlbum}
              onClose={onClose}
            />
          )}
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 18,
    color: colors.text.primary,
    fontFamily: 'Outfit_400Regular',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 18,
    color: colors.text.primary,
    fontFamily: 'Outfit_400Regular',
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface.medium,
    borderRadius: 16,
  },
  skipBtnText: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepIndicators: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface.light,
  },
  stepDotActive: {
    backgroundColor: colors.accent.primary,
    width: 16,
  },
  stepDotComplete: {
    backgroundColor: colors.accent.primaryBorder,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  continueContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  continueBtn: {
    backgroundColor: colors.accent.primary,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: colors.surface.medium,
  },
  continueBtnText: {
    fontSize: 14,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.inverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  continueBtnTextDisabled: {
    color: colors.text.muted,
  },

  // Resume prompt styles
  resumePrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  resumeIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  resumeTitle: {
    fontSize: 22,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  resumeSubtitle: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  resumeBtn: {
    backgroundColor: colors.accent.primary,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginBottom: 12,
  },
  resumeBtnText: {
    fontSize: 14,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.inverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  startFreshBtn: {
    backgroundColor: colors.surface.medium,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginBottom: 12,
  },
  startFreshBtnText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
  },
  cancelBtn: {
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.muted,
  },
});
