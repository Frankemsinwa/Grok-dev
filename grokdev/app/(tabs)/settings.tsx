import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useModelStore } from '../../store/modelStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Font, Radius, Spacing, Shadows } from '../../constants/theme';

const Section = ({ children, title }: { children: React.ReactNode, title: string }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={[styles.sectionCard, Shadows.card]}>{children}</View>
  </View>
);

const SectionRow = ({ children, onPress, last }: { children: React.ReactNode, onPress?: () => void, last?: boolean }) => {
  const content = (
    <View style={[styles.row, !last && styles.rowDivider]}>{children}</View>
  );
  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>
  ) : content;
};

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const { selectedModel, geminiApiKey, loadApiKeys, setGeminiApiKey, clearGeminiApiKey, isKeysLoaded } = useModelStore();
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');

  useEffect(() => {
    if (!isKeysLoaded) loadApiKeys();
  }, []);

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
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
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>

          {/* Profile */}
          <Section title="Profile">
            <SectionRow>
              <View style={styles.avatarContainer}>
                <Ionicons name="person" size={28} color={Colors.textPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{user?.username || 'Developer'}</Text>
                <Text style={styles.rowSubtitle}>{user?.email || 'Signed in with GitHub'}</Text>
              </View>
            </SectionRow>
          </Section>

          {/* Account */}
          <Section title="Account">
            <SectionRow last>
              <View style={styles.rowLeading}>
                <Ionicons name="logo-github" size={22} color={Colors.textPrimary} />
                <View>
                  <Text style={styles.rowTitle}>GitHub</Text>
                  <Text style={styles.rowStatus}>Connected</Text>
                </View>
              </View>
              <View style={[styles.badge, { backgroundColor: Colors.success, borderColor: Colors.success }]}>
                <Text style={styles.badgeText}>Active</Text>
              </View>
            </SectionRow>
          </Section>

          {/* Model */}
          <Section title="AI Model">
            <SectionRow last>
              <View style={styles.rowLeading}>
                <View style={[styles.modelLogoBox, { backgroundColor: selectedModel.accentColor }]}>
                  <Image source={selectedModel.logo} style={{ width: selectedModel.logoRound ? 34 : 22, height: selectedModel.logoRound ? 34 : 22, borderRadius: selectedModel.logoRound ? 17 : 0 }} resizeMode="cover" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>{selectedModel.name}</Text>
                  <Text style={styles.rowStatus}>
                    {selectedModel.provider === 'gemini' ? 'Google AI' : 'xAI'}
                  </Text>
                </View>
              </View>
              <View style={[styles.badge, { backgroundColor: Colors.accentMuted, borderColor: Colors.accent }]}>
                <Text style={[styles.badgeText, { color: Colors.accent }]}>Active</Text>
              </View>
            </SectionRow>
          </Section>

          {/* Gemini API Key */}
          <Section title="Gemini API Key">
            {geminiApiKey ? (
              <>
                <SectionRow>
                  <View style={styles.rowLeading}>
                    <Ionicons name="shield-checkmark" size={20} color={Colors.success} />
                    <View>
                      <Text style={styles.rowTitle}>Key configured</Text>
                      <Text style={styles.rowStatus}>Saved on this device</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowKeyInput(true);
                        setNewApiKey('');
                      }}
                      style={styles.smallBtn}
                    >
                      <Text style={[styles.smallBtnText, { color: Colors.accent }]}>Change</Text>
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
                      style={styles.smallBtn}
                    >
                      <Text style={[styles.smallBtnText, { color: Colors.danger }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </SectionRow>
                <SectionRow last>
                  <Text style={styles.monoText}>••••••••{geminiApiKey.slice(-6)}</Text>
                </SectionRow>
              </>
            ) : showKeyInput ? (
              <View>
                <Text style={styles.hintText}>Enter your Google AI API key from aistudio.google.com</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  <TextInput
                    style={styles.keyInput}
                    value={newApiKey}
                    onChangeText={setNewApiKey}
                    placeholder="AIzaSy..."
                    placeholderTextColor={Colors.textMuted}
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
                    style={[styles.saveBtn, newApiKey.trim().length < 10 && { opacity: 0.4 }]}
                  >
                    <Ionicons name="checkmark" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => { setShowKeyInput(false); setNewApiKey(''); }} style={{ marginTop: Spacing.md }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <SectionRow last onPress={() => setShowKeyInput(true)}>
                <View style={styles.rowLeading}>
                  <Ionicons name="key" size={20} color={Colors.warning} />
                  <View>
                    <Text style={styles.rowTitle}>Add Gemini key</Text>
                    <Text style={styles.rowStatus}>Enable Google Gemini models</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </SectionRow>
            )}
          </Section>

          {/* Sign out */}
          <TouchableOpacity
            style={[styles.logoutButton, Shadows.card]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>

          <Text style={styles.version}>GrokDev v1.0.43</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: 120,
  },
  header: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Font.sizeXXL,
    fontWeight: '700',
    fontFamily: Font.sans,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: Font.sizeMD,
    fontWeight: '600',
    fontFamily: Font.sans,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  rowTitle: {
    color: Colors.textPrimary,
    fontSize: Font.sizeMD,
    fontWeight: '600',
    fontFamily: Font.sans,
  },
  rowSubtitle: {
    color: Colors.textMuted,
    fontSize: Font.sizeSM,
    fontFamily: Font.sans,
    marginTop: 2,
  },
  rowStatus: {
    color: Colors.textSecondary,
    fontSize: Font.sizeSM,
    marginTop: 2,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelLogoBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  badgeText: {
    color: Colors.white,
    fontSize: Font.sizeXS,
    fontWeight: '600',
    fontFamily: Font.sans,
  },
  smallBtn: {
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  smallBtnText: {
    fontSize: Font.sizeXS,
    fontWeight: '600',
    fontFamily: Font.sans,
  },
  monoText: {
    color: Colors.textMuted,
    fontSize: Font.sizeSM,
    fontFamily: Font.mono,
  },
  hintText: {
    color: Colors.textSecondary,
    fontSize: Font.sizeSM,
    marginBottom: Spacing.md,
  },
  keyInput: {
    flex: 1,
    backgroundColor: Colors.surfaceMuted,
    color: Colors.textPrimary,
    padding: Spacing.md,
    borderRadius: Radius.md,
    fontFamily: Font.mono,
    fontSize: 13,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    width: 48,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: Font.sizeSM,
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: Colors.surface,
    height: 56,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoutText: {
    color: Colors.danger,
    fontWeight: '600',
    fontSize: Font.sizeMD,
    fontFamily: Font.sans,
  },
  version: {
    color: Colors.textMuted,
    fontSize: Font.sizeXS,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  }
});
