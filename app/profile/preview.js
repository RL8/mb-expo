import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import ProfileCard from '../../components/ProfileCard';
import { loadProfile } from '../../lib/storage';
import { colors } from '../../lib/theme';

export default function ProfilePreviewScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile().then(p => {
      setProfile(p);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No profile found</Text>
      </View>
    );
  }

  return (
    <ProfileCard
      profile={profile}
      onClose={() => router.push('/')}
      onEdit={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: colors.text.secondary, fontFamily: 'Outfit_400Regular' },
});
