import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Dimensions, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import Starfield from '../../components/Starfield';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing, interpolate, withRepeat, withSequence } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { API_BASE_URL } from '../../constants/Config';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(50);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    formOpacity.value = withDelay(200, withTiming(1, { duration: 800 }));
    formTranslateY.value = withDelay(200, withTiming(0, { duration: 800, easing: Easing.out(Easing.back(1.5)) }));
    
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

  const glowStyle = useAnimatedStyle(() => ({
      opacity: glowOpacity.value,
      transform: [{ scale: interpolate(glowOpacity.value, [0.3, 0.6], [1, 1.1]) }]
  }));

  const handleRegister = async () => {
    if (!username || !email || !password || !confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Please fill in all fields to establish uplink');
      return;
    }

    if (password !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Access keys do not match. Encryption failed.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    const registrationUrl = `${API_BASE_URL}/auth/register`;
    const registrationData = { username, email, password };

    console.log('[Network] Attempting Uplink to:', registrationUrl);
    console.log('[Network] Payload Check:', JSON.stringify({ username, email, password: '***' }));

    try {
      const response = await fetch(registrationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      console.log('[Network] Uplink Result Status:', response.status);
      const data = await response.json();
      console.log('[Network] Uplink Response Data:', data);

      if (response.ok) {
        await setAuth(data.user, data.token);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)/home');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Registration Failed', data.error || 'User already exists or neural data invalid');
      }
    } catch (error: any) {
      console.error('--- REGISTRATION CRITICAL FAILURE ---');
      console.error('Target URL:', registrationUrl);
      console.error('Error Name:', error.name);
      console.error('Error Message:', error.message);
      
      if (error.message === 'Network request failed') {
        console.error('DIAGNOSIS: The app cannot reach the server.');
        console.error('POSSIBLE CAUSES:');
        console.error('1. Server is not running at', API_BASE_URL);
        console.error('2. Device is on a different network than server');
        console.error('3. Android/iOS blocking non-HTTPS (Check cleartext settings)');
        console.error('4. CORS settings on the backend');
      }
      
      console.error('Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      console.error('-------------------------------------');

      Alert.alert('Error', 'Neural bridge unstable. Please retry uplink.');
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
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Animated.View style={[styles.glow, glowStyle]} />
            <Text style={styles.title}>JOIN <Text style={{ color: '#FFFFFF' }}>GROK</Text></Text>
            <Text style={styles.tagline}>ESTABLISH NEURAL UPLINK</Text>
          </View>

          <Animated.View style={[styles.formContainer, formAnimatedStyle]}>
            <BlurView intensity={30} tint="dark" style={styles.blurContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="at-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Neural Handle (Username)"
                  placeholderTextColor="#64748b"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>

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
                  placeholder="Set Access Key (Password)"
                  placeholderTextColor="#64748b"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Access Key"
                  placeholderTextColor="#64748b"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity 
                style={styles.registerButton}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.registerButtonText}>CREATE NEURAL PROFILE</Text>
                    <Ionicons name="add-circle-outline" size={18} color="#000" />
                  </View>
                )}
              </TouchableOpacity>
            </BlurView>

            <TouchableOpacity 
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.back();
                }} 
                style={styles.loginLink}
            >
              <Text style={styles.loginText}>
                Already established? <Text style={styles.loginLinkHighlight}>Initiate Session</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
  title: {
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
  registerButton: {
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
  registerButtonText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 2,
    marginRight: 8,
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginText: {
    color: '#64748b',
    fontSize: 14,
  },
  loginLinkHighlight: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  }
});
