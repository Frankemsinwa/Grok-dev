import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Image } from 'react-native';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Radius, Spacing } from '../../constants/theme';

const GROK_LOGO = require('../../assets/Grok-trans.png');

const GITHUB_CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID;

export default function LoginScreen() {
  const handleGitHubAuth = async () => {
    try {
      const redirectUri = Linking.createURL('oauth');
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,user`;
      await Linking.openURL(authUrl);
    } catch (error: any) {
      Alert.alert('Connection Error', error.message || 'Failed to open GitHub authentication.');
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image source={GROK_LOGO} style={styles.logo} resizeMode="contain" />
          </View>

          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>
            Sign in to connect your GitHub repositories and start coding.
          </Text>

          <View style={styles.card}>
            <TouchableOpacity style={styles.githubButton} onPress={handleGitHubAuth} activeOpacity={0.85}>
              <Ionicons name="logo-github" size={22} color="#fff" />
              <Text style={styles.githubButtonText}>Continue with GitHub</Text>
            </TouchableOpacity>

            <Text style={styles.terms}>
              By continuing, you authorize GrokDev to access your repositories and user profile.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logo: {
    width: 160,
    height: 50,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Font.sizeXXXL,
    fontWeight: '700',
    fontFamily: Font.sans,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Font.sizeLG,
    fontFamily: Font.sans,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xxxl,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
  },
  githubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    height: 54,
    width: '100%',
    gap: Spacing.md,
  },
  githubButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: Font.sizeLG,
    fontFamily: Font.sans,
  },
  terms: {
    color: Colors.textMuted,
    fontSize: Font.sizeSM,
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: 18,
    paddingHorizontal: Spacing.sm,
  },
});
