import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { View, ActivityIndicator } from 'react-native';

export default function NotFound() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
}
