import { useRouter } from 'expo-router';
import PremiumPage from '../../components/PremiumPage';

export default function PremiumScreen() {
  const router = useRouter();

  return (
    <PremiumPage
      onClose={() => router.back()}
      onSuccess={() => router.push('/')}
    />
  );
}
