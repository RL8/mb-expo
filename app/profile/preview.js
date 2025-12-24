import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import ProfileCard from '../../components/ProfileCard';
import { loadProfile } from '../../lib/storage';
import { useDataStore } from '../../stores/dataStore';
import { colors } from '../../lib/theme';

export default function ProfilePreviewScreen() {
  const router = useRouter();
  const { albums, songs, loadData, isLoading } = useDataStore();
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    loadData();
    loadProfile().then(p => {
      setProfile(p);
      setProfileLoading(false);
    });
  }, []);

  // Group songs by album for ProfileCard
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

  if (isLoading || profileLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>No profile found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ProfileCard
        profile={profile}
        albums={albums}
        songsByAlbum={songsByAlbum}
        onClose={() => router.push('/')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center' },
  safeArea: { flex: 1, backgroundColor: colors.bg.primary },
  errorText: { fontSize: 16, color: colors.text.secondary, fontFamily: 'Outfit_400Regular' },
});
