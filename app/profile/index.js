import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import ProfileBuilder from '../../components/ProfileBuilder';
import { useDataStore } from '../../stores/dataStore';

export default function ProfileScreen() {
  const router = useRouter();
  const { albums, songs, loadData, isLoading } = useDataStore();

  useEffect(() => {
    loadData();
  }, []);

  return (
    <ProfileBuilder
      albums={albums}
      songs={songs}
      onClose={() => router.back()}
      onPreview={() => router.push('/profile/preview')}
    />
  );
}
