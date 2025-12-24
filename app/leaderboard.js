import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import ComparisonLeaderboard from '../components/ComparisonLeaderboard';
import { useDataStore } from '../stores/dataStore';

export default function LeaderboardScreen() {
  const router = useRouter();
  const { albums, songs, loadData } = useDataStore();

  useEffect(() => {
    loadData();
  }, []);

  return (
    <ComparisonLeaderboard
      albums={albums}
      songs={songs}
      onClose={() => router.back()}
    />
  );
}
