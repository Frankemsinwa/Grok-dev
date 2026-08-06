import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useRepoStore } from '../../store/repoStore';
import { Colors, Font, Radius, Spacing, Shadows, globalStyles } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { currentRepo } = useRepoStore();

  const firstName = user?.username || 'Developer';

  return (
    <View style={globalStyles.screen}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Good to see you</Text>
              <Text style={styles.userName}>{firstName}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/settings')} style={styles.avatar}>
              <Ionicons name="person" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* New session card */}
          <TouchableOpacity
            onPress={() => router.push('/chat/new')}
            activeOpacity={0.9}
            style={[globalStyles.card, styles.heroCard, Shadows.card]}
          >
            <View style={styles.heroHeader}>
              <View style={styles.heroIcon}>
                <Ionicons name="sparkles" size={18} color={Colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Start a session</Text>
                <Text style={styles.heroSubtitle}>
                  Ask GrokDev to read your repo, write code, or find bugs.
                </Text>
              </View>
            </View>
            <View style={styles.heroAction}>
              <Text style={styles.heroActionText}>New conversation</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
            </View>
          </TouchableOpacity>

          {/* Active repository */}
          <Text style={styles.sectionTitle}>Repository</Text>
          {currentRepo ? (
            <TouchableOpacity
              onPress={() => router.push('/explorer')}
              activeOpacity={0.8}
              style={[globalStyles.card, Shadows.card]}
            >
              <View style={styles.repoRow}>
                <View style={styles.repoIcon}>
                  <Ionicons name="logo-github" size={22} color={Colors.textPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.repoName}>{currentRepo.name}</Text>
                  <Text style={styles.repoPath}>
                    {currentRepo.owner.login} · {currentRepo.default_branch}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => router.push('/github')}
              activeOpacity={0.8}
              style={[globalStyles.card, styles.emptyRepo, Shadows.card]}
            >
              <Ionicons name="add" size={24} color={Colors.accent} />
              <Text style={styles.emptyRepoText}>Connect a repository</Text>
              <Text style={styles.emptyRepoSub}>Browse files and chat about your code</Text>
            </TouchableOpacity>
          )}

          {/* Quick actions */}
          <Text style={styles.sectionTitle}>Quick access</Text>
          <View style={styles.actionsGrid}>
            {[
              { id: 'chat', label: 'AI Chat', sub: 'Agent assistant', icon: 'sparkles-outline' },
              { id: 'explorer', label: 'File Explorer', sub: 'Browse repo', icon: 'folder-outline' },
              { id: 'github', label: 'Repositories', sub: 'Connect a repo', icon: 'logo-github' },
              { id: 'settings', label: 'Settings', sub: 'Preferences', icon: 'options-outline' },
            ].map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[globalStyles.card, styles.actionItem, Shadows.card]}
                activeOpacity={0.8}
                onPress={() => router.push(`/${action.id}` as any)}
              >
                <Ionicons name={action.icon as any} size={24} color={Colors.accent} />
                <Text style={styles.actionText}>{action.label}</Text>
                <Text style={styles.actionSubText}>{action.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  greeting: {
    color: Colors.textSecondary,
    fontSize: Font.sizeMD,
    fontFamily: Font.sans,
  },
  userName: {
    color: Colors.textPrimary,
    fontSize: Font.sizeXXXL,
    fontWeight: '700',
    fontFamily: Font.sans,
    marginTop: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    padding: Spacing.xl,
    marginBottom: Spacing.xxl,
    backgroundColor: Colors.surfaceElevated,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    color: Colors.textPrimary,
    fontSize: Font.sizeLG,
    fontWeight: '600',
    fontFamily: Font.sans,
  },
  heroSubtitle: {
    color: Colors.textSecondary,
    fontSize: Font.sizeSM,
    fontFamily: Font.sans,
    marginTop: 2,
    lineHeight: 18,
  },
  heroAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  heroActionText: {
    color: Colors.white,
    fontSize: Font.sizeMD,
    fontWeight: '600',
    fontFamily: Font.sans,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: Font.sizeMD,
    fontWeight: '600',
    fontFamily: Font.sans,
    marginBottom: Spacing.md,
  },
  repoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  repoIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repoName: {
    color: Colors.textPrimary,
    fontSize: Font.sizeLG,
    fontWeight: '600',
    fontFamily: Font.sans,
  },
  repoPath: {
    color: Colors.textSecondary,
    fontSize: Font.sizeSM,
    fontFamily: Font.sans,
    marginTop: 2,
  },
  emptyRepo: {
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  emptyRepoText: {
    color: Colors.textPrimary,
    fontSize: Font.sizeMD,
    fontWeight: '600',
    fontFamily: Font.sans,
    marginTop: Spacing.md,
  },
  emptyRepoSub: {
    color: Colors.textMuted,
    fontSize: Font.sizeSM,
    fontFamily: Font.sans,
    marginTop: 2,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionItem: {
    width: (width - Spacing.xl * 2 - Spacing.md) / 2,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
  actionText: {
    color: Colors.textPrimary,
    fontSize: Font.sizeMD,
    fontWeight: '600',
    fontFamily: Font.sans,
    marginTop: Spacing.md,
  },
  actionSubText: {
    color: Colors.textMuted,
    fontSize: Font.sizeSM,
    fontFamily: Font.sans,
    marginTop: 2,
  },
});
