import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import Starfield from '../components/Starfield';
import * as Linking from 'expo-linking';

import { API_BASE_URL } from '../constants/Config';

export default function OAuthCallback() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { user, token, setAuth } = useAuthStore();
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    
    if (code && token && user) {
      handled.current = true;
      exchangeCode();
    } else if (!code) {
        // If we arrived here without a code, something is wrong
        router.replace('/(tabs)/settings');
    }
  }, [code, token, user]);

  const exchangeCode = async () => {
    try {
      const redirectUri = Linking.createURL('oauth');
      const response = await fetch(`${API_BASE_URL}/github/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code, redirectUri })
      });

      if (response.ok) {
        // Update user state to mark GitHub as connected
        await setAuth({ ...user, isGithubConnected: true } as any, token!);
        Alert.alert('SUCCESS', 'Neural link to GitHub established.');
      } else {
        const err = await response.json();
        Alert.alert('LINK ERROR', err.error || 'Failed to synchronize with GitHub.');
      }
    } catch (error: any) {
      console.error('GitHub exchange error:', error);
      Alert.alert('BRIDGE ERROR', 'Fatal connection error during sync.');
    } finally {
      router.replace('/(tabs)/settings');
    }
  };

  return (
    <View style={styles.container}>
      <Starfield />
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#A855F7" />
        <Text style={styles.text}>SYNCHRONIZING WITH GITHUB...</Text>
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
    color: '#A855F7',
    marginTop: 20,
    fontWeight: 'bold',
    letterSpacing: 2,
    fontSize: 12,
    textAlign: 'center',
  }
});
