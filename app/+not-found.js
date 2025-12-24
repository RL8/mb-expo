import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../lib/theme';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔍</Text>
      <Text style={styles.title}>Page Not Found</Text>
      <Text style={styles.subtitle}>The page you're looking for doesn't exist.</Text>
      <Pressable style={styles.button} onPress={() => router.push('/')}>
        <Text style={styles.buttonText}>Go Home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emoji: { fontSize: 64, marginBottom: 20 },
  title: { fontSize: 24, color: colors.text.primary, fontFamily: 'Outfit_600SemiBold', marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.text.secondary, fontFamily: 'Outfit_400Regular', textAlign: 'center', marginBottom: 32 },
  button: { backgroundColor: colors.accent.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  buttonText: { color: colors.text.inverse, fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
});
