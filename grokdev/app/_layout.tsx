import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { View, ActivityIndicator } from 'react-native';
import Onboarding from '../components/Onboarding';

export default function RootLayout() {
  const { isAuthenticated, hasOnboarded, loadAuth, finishOnboarding } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    const init = async () => {
      await loadAuth();
      setIsInitialLoad(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (isInitialLoad) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to the login page if not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to the home page if authenticated
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, segments, isInitialLoad]);

  if (isInitialLoad) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="diff" options={{ presentation: 'modal' }} />
        <Stack.Screen name="editor" options={{ animation: 'slide_from_right' }} />
      </Stack>
      
      {showOnboarding && (
        <Onboarding 
          visible={true} 
          onFinish={() => {
            finishOnboarding();
            setShowOnboarding(false);
          }} 
        />
      )}
    </>
  );
}
