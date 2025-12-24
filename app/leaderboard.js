import { SafeAreaView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import ComparisonLeaderboard from '../components/ComparisonLeaderboard';
import { colors } from '../lib/theme';

export default function LeaderboardScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ComparisonLeaderboard
        onClose={() => router.back()}
        onViewProfile={(shareId) => router.push(`/p/${shareId}`)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
});
