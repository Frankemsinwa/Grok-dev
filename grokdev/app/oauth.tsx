import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import Starfield from '../components/Starfield';
import * as Linking from 'expo-linking';

import { API_BASE_URL } from '../constants/Config';

export default function OAuthCallback() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { setAuth } = useAuthStore();
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (!code) {
      router.replace('/(auth)/login');
      return;
    }

    handled.current = true;
    exchangeCode();
  }, [code]);

  const exchangeCode = async () => {
    try {
      const redirectUri = Linking.createURL('oauth');
      const response = await fetch(`${API_BASE_URL}/github/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri }),
      });

      const data = await response.json();

      if (response.ok && data.user && data.token) {
        await setAuth(data.user, data.token);
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(auth)/login');
      }
    } catch {
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      <Starfield />
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.text}>AUTHENTICATING...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    marginTop: 20,
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 12,
    textAlign: 'center',
  },
});
