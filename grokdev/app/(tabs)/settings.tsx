import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, ScrollView, Platform, Dimensions, TextInput, Image } from 'react-native';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../../store/authStore';
import { useModelStore } from '../../store/modelStore';
import { Ionicons } from '@expo/vector-icons';
import Starfield from '../../components/Starfield';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
import { API_BASE_URL } from '../../constants/Config';
const GITHUB_CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID;
const REDIRECT_URI = process.env.EXPO_PUBLIC_GITHUB_REDIRECT_URI || 'com.grokdev://oauth';

const GlassSection = ({ children, title, index = 0 }: { children: React.ReactNode, title: string, index?: number }) => (
    <Animated.View 
        entering={FadeInDown.delay(index * 100).springify()}
        style={styles.sectionContainer}
    >
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.glassWrapper}>
            {Platform.OS === 'ios' ? (
                <BlurView intensity={20} tint="dark" style={styles.glassInner}>
                    {children}
                </BlurView>
            ) : (
                <View style={[styles.glassInner, { backgroundColor: 'rgba(30, 41, 59, 0.5)' }]}>
                    {children}
                </View>
            )}
        </View>
    </Animated.View>
);

export default function SettingsScreen() {
  const { user, token, logout, setAuth } = useAuthStore();
  const { selectedModel, geminiApiKey, loadGeminiApiKey, setGeminiApiKey, clearGeminiApiKey, isGeminiKeyLoaded } = useModelStore();
  const [connecting, setConnecting] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');

  useEffect(() => {
    if (!isGeminiKeyLoaded) loadGeminiApiKey();
  }, []);

  const handleConnectGitHub = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConnecting(true);
    try {
      const dynamicRedirectUri = Linking.createURL('oauth');
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(dynamicRedirectUri)}&scope=repo,user`;

      Alert.alert(
        'GitHub Uplink',
        'Redirecting to GitHub Matrix for identity verification. \n\nNote: If you are using the Expo sandbox, make sure your GitHub App Callback URL is set to: \n\n' + dynamicRedirectUri,
        [
          { text: 'ABORT', style: 'cancel', onPress: () => setConnecting(false) },
          { 
            text: 'ESTABLISH', 
            onPress: async () => {
              try {
                Linking.openURL(authUrl);
                
                // Add a reasonable timeout (e.g., 60 seconds)
                setTimeout(() => {
                  setConnecting((currentConnectingStatus) => {
                    if (currentConnectingStatus) {
                      Alert.alert('UPLINK TIMEOUT', 'The connection to the GitHub matrix timed out. Please try again.');
                      return false;
                    }
                    return currentConnectingStatus;
                  });
                }, 60000); 

              } catch (err) {
                Alert.alert('SYSTEM ERROR', 'Failed to initialize browser module.');
                setConnecting(false);
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('GitHub error:', error);
      Alert.alert('BRIDGE ERROR', error.message || 'Fatal error during uplink.');
      setConnecting(false);
    }
  };

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'TERMINATE SESSION',
      'Are you sure you want to decouple your neural link?',
      [
        { text: 'STAY', style: 'cancel' },
        { 
          text: 'LOGOUT', 
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await logout();
          },
          style: 'destructive' 
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Starfield />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
            <View style={styles.profileGlow} />
            <View style={styles.avatarContainer}>
                <Ionicons name="person" size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.username}>{user?.username?.toUpperCase() || 'AGENT'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
        </Animated.View>

        <GlassSection title="Neural Profile" index={1}>
            <View style={styles.row}>
                <View>
                    <Text style={styles.label}>Access ID</Text>
                    <Text style={styles.value}>{user?.id?.substring(0, 12)}...</Text>
                </View>
                <Ionicons name="finger-print" size={20} color="#FFFFFF" />
            </View>
        </GlassSection>

        <GlassSection title="Uplinks" index={2}>
            <TouchableOpacity 
                style={[
                    styles.row, 
                    user?.isGithubConnected && styles.connectedRow
                ]}
                onPress={handleConnectGitHub}
                disabled={connecting || !!user?.isGithubConnected}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="logo-github" size={24} color="#fff" style={{ marginRight: 16 }} />
                    <View>
                        <Text style={styles.rowTitle}>GitHub Matrix</Text>
                        <Text style={[
                            styles.rowStatus,
                            { color: user?.isGithubConnected ? '#4ade80' : '#64748b' }
                        ]}>
                            {user?.isGithubConnected ? 'SYNCHRONIZED' : 'DECOUPLED'}
                        </Text>
                    </View>
                </View>
                {connecting ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    !user?.isGithubConnected && <Ionicons name="chevron-forward" size={20} color="#64748b" />
                )}
            </TouchableOpacity>
        </GlassSection>

        <GlassSection title="Neural Core" index={3}>
            <View style={styles.row}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: selectedModel.accentColor, borderWidth: 1, borderColor: `${selectedModel.color}44`, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                        <Image source={selectedModel.logo} style={{ width: selectedModel.logoRound ? 40 : 24, height: selectedModel.logoRound ? 40 : 24, borderRadius: selectedModel.logoRound ? 20 : 0 }} resizeMode="cover" />
                    </View>
                    <View>
                        <Text style={styles.rowTitle}>{selectedModel.name}</Text>
                        <Text style={[styles.rowStatus, { color: selectedModel.color }]}>{selectedModel.provider === 'gemini' ? 'GOOGLE AI' : 'xAI'}</Text>
                    </View>
                </View>
                <View style={[styles.badge, { borderColor: `${selectedModel.color}66`, backgroundColor: selectedModel.accentColor }]}>
                    <Text style={[styles.badgeText, { color: selectedModel.color }]}>ACTIVE</Text>
                </View>
            </View>
        </GlassSection>

        <GlassSection title="Gemini API Key" index={4}>
            {geminiApiKey ? (
              <>
                <View style={styles.row}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="shield-checkmark" size={20} color="#4ade80" />
                    <View>
                      <Text style={styles.rowTitle}>Key Configured</Text>
                      <Text style={[styles.rowStatus, { color: '#4ade80' }]}>SAVED ON DEVICE</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowKeyInput(true);
                        setNewApiKey('');
                      }}
                      style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.25)' }}
                    >
                      <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 }}>CHANGE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert(
                          'Remove Gemini Key?',
                          'This will delete the API key from this device.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Remove', style: 'destructive', onPress: () => {
                              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                              clearGeminiApiKey();
                            }},
                          ]
                        );
                      }}
                      style={{ backgroundColor: 'rgba(248, 113, 113, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.25)' }}
                    >
                      <Text style={{ color: '#f87171', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 }}>REMOVE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={[styles.row, { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }]}>
                  <Text style={{ color: '#334155', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>••••••••{geminiApiKey.slice(-6)}</Text>
                </View>
              </>
            ) : showKeyInput ? (
              <>
                <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>Enter your Google AI API key from aistudio.google.com</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={{ flex: 1, backgroundColor: '#0f172a', color: '#fff', padding: 12, borderRadius: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}
                    value={newApiKey}
                    onChangeText={setNewApiKey}
                    placeholder="AIzaSy..."
                    placeholderTextColor="#334155"
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                  />
                  <TouchableOpacity
                    onPress={() => {
                      if (newApiKey.trim().length < 10) {
                        Alert.alert('Invalid', 'Please enter a valid API key.');
                        return;
                      }
                      setGeminiApiKey(newApiKey.trim());
                      setNewApiKey('');
                      setShowKeyInput(false);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }}
                    disabled={newApiKey.trim().length < 10}
                    style={{ backgroundColor: '#4285F4', width: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', opacity: newApiKey.trim().length < 10 ? 0.4 : 1 }}
                  >
                    <Ionicons name="checkmark" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => { setShowKeyInput(false); setNewApiKey(''); }} style={{ marginTop: 10 }}>
                  <Text style={{ color: '#64748b', fontSize: 12, textAlign: 'center' }}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => setShowKeyInput(true)}
                style={styles.row}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="key" size={20} color="#FBBF24" />
                  <View>
                    <Text style={styles.rowTitle}>Add Gemini Key</Text>
                    <Text style={[styles.rowStatus, { color: '#64748b' }]}>Enable Google Gemini models</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#334155" />
              </TouchableOpacity>
            )}
        </GlassSection>

        <Animated.View entering={FadeInDown.delay(500).springify()}>
            <TouchableOpacity 
                style={styles.logoutButton}
                onPress={handleLogout}
            >
                <Text style={styles.logoutText}>TERMINATE SESSION</Text>
            </TouchableOpacity>
        </Animated.View>

        <Text style={styles.version}>GROKDEV OS v1.0.43 • KERNEL: {selectedModel.name.toUpperCase()}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  profileGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    filter: 'blur(30px)',
    opacity: 0.4,
    top: 0,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginBottom: 16,
  },
  username: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  email: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  glassWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  glassInner: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  rowTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rowStatus: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  connectedRow: {
    borderColor: 'rgba(74, 222, 128, 0.2)',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 14,
  },
  version: {
    color: '#334155',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 30,
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});
