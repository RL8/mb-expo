import { SafeAreaView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import SharedProfileView from '../../components/SharedProfileView';
import { colors } from '../../lib/theme';

export default function SharedProfileScreen() {
  const router = useRouter();
  const { shareId } = useLocalSearchParams();

  return (
    <SafeAreaView style={styles.container}>
      <SharedProfileView
        shareId={shareId}
        onClose={() => router.push('/')}
        onCreateProfile={() => router.push('/profile')}
        onViewLeaderboard={() => router.push('/leaderboard')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
});
