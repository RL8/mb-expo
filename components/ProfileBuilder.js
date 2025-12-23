import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, SafeAreaView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AlbumRanker from './AlbumRanker';
import SongPicker from './SongPicker';
import LyricSelector from './LyricSelector';
import ProfileCard from './ProfileCard';
import { saveProfile, loadProfile, createEmptyProfile } from '../lib/storage';

const STEPS = [
  { key: 'albums', label: 'Albums', component: 'AlbumRanker' },
  { key: 'songs', label: 'Songs', component: 'SongPicker' },
  { key: 'lyric', label: 'Lyric', component: 'LyricSelector' },
  { key: 'preview', label: 'Share', component: 'ProfileCard' },
];

export default function ProfileBuilder({ albums, songs, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState(createEmptyProfile());

  // Load saved profile on mount
  useEffect(() => {
    loadProfile().then(saved => {
      if (saved) setProfile(saved);
    });
  }, []);

  // Auto-save when profile changes
  useEffect(() => {
    if (profile.albumRanking.length > 0 || profile.topSongs.length > 0 || profile.favoriteLyric) {
      saveProfile(profile);
    }
  }, [profile]);

  const updateAlbumRanking = (ranking) => {
    setProfile(prev => ({ ...prev, albumRanking: ranking }));
  };

  const updateTopSongs = (topSongs) => {
    setProfile(prev => ({ ...prev, topSongs }));
  };

  const updateFavoriteLyric = (lyric) => {
    setProfile(prev => ({ ...prev, favoriteLyric: lyric }));
  };

  const canProceed = () => {
    switch (STEPS[currentStep].key) {
      case 'albums':
        return profile.albumRanking.length === 3;
      case 'songs':
        return profile.topSongs.length > 0;
      case 'lyric':
        return true; // Optional
      case 'preview':
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onClose();
    }
  };

  const step = STEPS[currentStep];

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backBtnText}>
              {currentStep === 0 ? '×' : '←'}
            </Text>
          </Pressable>

          {/* Step indicators */}
          <View style={styles.stepIndicators}>
            {STEPS.map((s, idx) => (
              <View
                key={s.key}
                style={[
                  styles.stepDot,
                  idx === currentStep && styles.stepDotActive,
                  idx < currentStep && styles.stepDotComplete,
                ]}
              />
            ))}
          </View>

          <View style={styles.headerSpacer} />
        </View>

        {/* Step content */}
        <View style={styles.content}>
          {step.key === 'albums' && (
            <AlbumRanker
              albums={albums}
              ranking={profile.albumRanking}
              onRankingChange={updateAlbumRanking}
            />
          )}
          {step.key === 'songs' && (
            <SongPicker
              albums={albums}
              songs={songs}
              selectedSongs={profile.topSongs}
              onSelectionChange={updateTopSongs}
              maxSongs={3}
            />
          )}
          {step.key === 'lyric' && (
            <LyricSelector
              albums={albums}
              songs={songs}
              selectedLyric={profile.favoriteLyric}
              onLyricSelect={updateFavoriteLyric}
            />
          )}
          {step.key === 'preview' && (
            <ProfileCard
              profile={profile}
              albums={albums}
              songs={songs}
              onClose={onClose}
            />
          )}
        </View>

        {/* Footer navigation */}
        {step.key !== 'preview' && (
          <View style={styles.footer}>
            <Pressable
              style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
              onPress={handleNext}
              disabled={!canProceed()}
            >
              <Text style={[styles.nextBtnText, !canProceed() && styles.nextBtnTextDisabled]}>
                {step.key === 'lyric' ? 'Preview' : 'Next'}
              </Text>
            </Pressable>
            {step.key === 'lyric' && !profile.favoriteLyric && (
              <Text style={styles.skipHint}>No lyric selected — that's okay!</Text>
            )}
          </View>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 18,
    color: '#e2e8f0',
    fontFamily: 'Outfit_400Regular',
  },
  stepIndicators: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  stepDotActive: {
    backgroundColor: '#38bdf8',
    width: 24,
  },
  stepDotComplete: {
    backgroundColor: 'rgba(56, 189, 248, 0.5)',
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.3)',
  },
  nextBtn: {
    backgroundColor: '#38bdf8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextBtnDisabled: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  nextBtnText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: '#020617',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nextBtnTextDisabled: {
    color: 'rgba(2, 6, 23, 0.4)',
  },
  skipHint: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: 'rgba(148, 163, 184, 0.5)',
    textAlign: 'center',
    marginTop: 8,
  },
});
