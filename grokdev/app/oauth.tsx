import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import * as Linking from 'expo-linking';
import { Colors, Font, Spacing } from '../constants/theme';

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
      const response = await fetch(`${API_BASE_URL}/auth/github`, {
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
      <View style={styles.content}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.text}>Signing in...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  text: {
    color: Colors.textSecondary,
    marginTop: Spacing.xl,
    fontSize: Font.sizeMD,
    fontFamily: Font.sans,
    textAlign: 'center',
  },
});
