import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import SharedProfileView from '../../components/SharedProfileView';

export default function SharedProfileScreen() {
  const router = useRouter();
  const { shareId } = useLocalSearchParams();

  return (
    <SharedProfileView
      shareId={shareId}
      onClose={() => router.push('/')}
    />
  );
}
