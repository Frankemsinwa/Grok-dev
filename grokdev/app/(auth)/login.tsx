import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Dimensions, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import Starfield from '../../components/Starfield';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing, interpolate, withRepeat, withSequence } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { API_BASE_URL } from '../../constants/Config';

const GROK_LOGO = require('../../assets/Grok-trans.png');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(50);
  const logoScale = useSharedValue(0.8);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    formOpacity.value = withDelay(400, withTiming(1, { duration: 800 }));
    formTranslateY.value = withDelay(400, withTiming(0, { duration: 800, easing: Easing.out(Easing.back(1.5)) }));
    logoScale.value = withDelay(200, withTiming(1, { duration: 1000, easing: Easing.out(Easing.exp) }));
    
    glowOpacity.value = withRepeat(
        withSequence(
            withTiming(0.6, { duration: 2000 }),
            withTiming(0.3, { duration: 2000 })
        ),
        -1,
        true
    );
  }, []);

  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }]
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }]
  }));

  const glowStyle = useAnimatedStyle(() => ({
      opacity: glowOpacity.value,
      transform: [{ scale: interpolate(glowOpacity.value, [0.3, 0.6], [1, 1.1]) }]
  }));

  const handleLogin = async () => {
    if (!email || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        await setAuth(data.user, data.token);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)/home');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Login Failed', data.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Starfield />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.inner}>
          <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
            <Animated.View style={[styles.glow, glowStyle]} />
            <Image source={GROK_LOGO} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.tagline}>CO-PILOTED BY GROK-3</Text>
          </Animated.View>

          <Animated.View style={[styles.formContainer, formAnimatedStyle]}>
            <BlurView intensity={30} tint="dark" style={styles.blurContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Neural Identity (Email)"
                  placeholderTextColor="#64748b"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Access Key (Password)"
                  placeholderTextColor="#64748b"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity 
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.loginButtonText}>INITIATE SESSION</Text>
                    <Ionicons name="chevron-forward" size={18} color="#000" />
                  </View>
                )}
              </TouchableOpacity>

            </BlurView>

            <TouchableOpacity 
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/register');
                }} 
                style={styles.registerLink}
            >
              <Text style={styles.registerText}>
                No uplink established? <Text style={styles.registerLinkHighlight}>Create Account</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardView: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
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
  logo: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 4,
  },
  tagline: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: 8,
  },
  formContainer: {
    width: '100%',
  },
  blurContainer: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputIcon: {
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    color: '#fff',
    padding: 16,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 2,
    marginRight: 8,
  },
  registerLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerText: {
    color: '#64748b',
    fontSize: 14,
  },
  registerLinkHighlight: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  }
});
