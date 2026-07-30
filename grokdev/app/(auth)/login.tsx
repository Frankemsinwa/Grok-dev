import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Image, Linking } from 'react-native';
import Starfield from '../../components/Starfield';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing, withRepeat, withSequence } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const GROK_LOGO = require('../../assets/Grok-trans.png');

const GITHUB_CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID;

export default function LoginScreen() {

  const logoScale = useSharedValue(0.8);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(30);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    logoScale.value = withDelay(200, withTiming(1, { duration: 1000, easing: Easing.out(Easing.exp) }));
    contentOpacity.value = withDelay(600, withTiming(1, { duration: 800 }));
    contentTranslateY.value = withDelay(600, withTiming(0, { duration: 800, easing: Easing.out(Easing.back(1.5)) }));
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 2000 }),
        withTiming(0.3, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }]
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowOpacity.value }]
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }]
  }));

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
      <Starfield />

      <View style={styles.inner}>
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <Animated.View style={[styles.glow, glowStyle]} />
          <Image source={GROK_LOGO} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.tagline}>CO-PILOTED BY GROK-3</Text>
        </Animated.View>

        <Animated.View style={[styles.content, contentAnimatedStyle]}>
          <View style={styles.card}>
            <TouchableOpacity style={styles.githubButton} onPress={handleGitHubAuth} activeOpacity={0.85}>
              <Ionicons name="logo-github" size={24} color="#000" />
              <Text style={styles.githubButtonText}>SIGN IN WITH GITHUB</Text>
            </TouchableOpacity>

            <Text style={styles.terms}>
              By signing in, you authorize GrokDev to access your public repositories and user profile.
            </Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  glow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    filter: 'blur(40px)',
    zIndex: -1,
  },
  logoImage: {
    width: 200,
    height: 60,
  },
  tagline: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: 8,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  githubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 56,
    width: '100%',
    gap: 12,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  githubButtonText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 2,
  },
  terms: {
    color: '#475569',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
});
