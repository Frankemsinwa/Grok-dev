import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useRepoStore } from '../../store/repoStore';
import Starfield from '../../components/Starfield';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

const GlassCard = ({ children, style, borderRadius = 12 }: { children: React.ReactNode, style?: any, borderRadius?: number }) => (
    <View style={[styles.glassCard, { borderRadius }, style]}>
        {Platform.OS === 'ios' ? (
            <BlurView intensity={30} tint="dark" style={styles.blur}>
                {children}
            </BlurView>
        ) : (
            <View style={[styles.blur, { backgroundColor: 'rgba(15, 23, 42, 0.8)' }]}>
                {children}
            </View>
        )}
    </View>
);

const TelemetryItem = ({ label, value, color = '#22D3EE' }: { label: string, value: string, color?: string }) => (
    <View style={styles.telemetryItem}>
        <Text style={styles.telemetryLabel}>{label}</Text>
        <Text style={[styles.telemetryValue, { color }]}>{value}</Text>
    </View>
);

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { currentRepo } = useRepoStore();

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <Starfield />
      
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={styles.livePulse} />
                        <Text style={styles.welcome}>SYSTEM TERMINAL // HUB-01</Text>
                    </View>
                    <Text style={styles.userName}>{user?.username?.toUpperCase() || 'NODE-01'}</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/settings')}>
                    <View style={styles.avatar}>
                        <Ionicons name="finger-print" size={24} color="#FFFFFF" />
                    </View>
                </TouchableOpacity>
            </View>

            {/* Telemetry Row */}
            <View style={styles.telemetryRow}>
                <TelemetryItem label="SYNC" value="99.8%" />
                <TelemetryItem label="LATENCY" value="12ms" />
                <TelemetryItem label="UPTIME" value="99.9%" />
                <TelemetryItem label="THREADS" value="128" />
            </View>

            {/* Hero Section */}
            <GlassCard style={styles.heroCard} borderRadius={16}>
                <View style={styles.heroGlow} />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Ionicons name="pulse" size={18} color="#22D3EE" />
                    <Text style={styles.engineText}>GROK-3 NEURAL ENGINE ACTIVE [STABLE]</Text>
                </View>
                <Text style={styles.heroTitle}>Direct neural interface to project consciousness.</Text>
                <TouchableOpacity 
                    style={styles.heroButton}
                    onPress={() => router.push('/chat')}
                >
                    <Text style={styles.heroButtonText}>INITIATE SESSION</Text>
                    <Ionicons name="terminal" size={18} color="#000" />
                </TouchableOpacity>
            </GlassCard>

            {/* Repo Section */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>ACTIVE REPOSITORY</Text>
                <View style={[styles.dot, { backgroundColor: currentRepo ? '#22D3EE' : '#64748b' }]} />
            </View>

            {currentRepo ? (
                <GlassCard style={styles.repoCard}>
                    <TouchableOpacity 
                        onPress={() => router.push('/explorer')}
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                        <View style={styles.repoIconContainer}>
                            <Ionicons name="logo-github" size={28} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.repoName}>{currentRepo.name.toUpperCase()}</Text>
                            <Text style={styles.repoPath}>{currentRepo.owner.login.toUpperCase()} / {currentRepo.default_branch.toUpperCase()}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </GlassCard>
            ) : (
                <TouchableOpacity 
                    onPress={() => router.push('/github')}
                    style={styles.emptyRepoCard}
                >
                    <Ionicons name="add" size={32} color="#FFFFFF" />
                    <Text style={styles.emptyRepoText}>MOUNT REPOSITORY</Text>
                </TouchableOpacity>
            )}

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>CORE MODULES</Text>
            <View style={styles.actionsGrid}>
                {[
                    { id: 'chat', label: 'NEURAL CORE', sub: 'AI AGENT', icon: 'chatbubbles', color: '#FFFFFF' },
                    { id: 'explorer', label: 'FILE SYSTEM', sub: 'EXPLORER', icon: 'folder', color: '#22D3EE' },
                    { id: 'github', label: 'WORKSPACES', sub: 'CLONE/SYNC', icon: 'logo-github', color: '#fff' },
                    { id: 'settings', label: 'CONFIG', sub: 'TERMINAL', icon: 'construct', color: '#64748B' }
                ].map((action) => (
                    <TouchableOpacity 
                        key={action.id} 
                        style={styles.actionItem} 
                        onPress={() => router.push(`/${action.id}` as any)}
                    >
                        <GlassCard style={styles.actionGlass}>
                            <Ionicons name={action.icon as any} size={28} color={action.color} />
                            <Text style={styles.actionText}>{action.label}</Text>
                            <Text style={styles.actionSubText}>{action.sub}</Text>
                        </GlassCard>
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22D3EE',
    marginRight: 8,
    shadowColor: '#22D3EE',
    shadowRadius: 4,
    shadowOpacity: 0.8,
  },
  welcome: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif',
    letterSpacing: 0,
  },
  userName: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif',
    letterSpacing: 0,
    marginTop: 4,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingHorizontal: 4,
  },
  telemetryItem: {
    alignItems: 'flex-start',
  },
  telemetryLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif',
    marginBottom: 2,
  },
  telemetryValue: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'GeistMono' : 'monospace',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  glassCard: {
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 24,
  },
  blur: {
    padding: 24,
  },
  heroCard: {
    marginBottom: 30,
    position: 'relative',
    borderColor: 'rgba(34, 211, 238, 0.2)',
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 90,
    opacity: 0.08,
  },
  engineText: {
    color: '#22D3EE',
    fontSize: 12,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif',
    marginLeft: 8,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '400',
    lineHeight: 36,
    fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif',
    marginBottom: 20,
  },
  heroButton: {
    backgroundColor: '#fff',
    height: 52,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    shadowColor: '#fff',
    shadowRadius: 10,
    shadowOpacity: 0.2,
  },
  heroButtonText: {
    color: '#000',
    fontWeight: '400',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'GeistMono' : 'monospace',
    marginRight: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif',
    marginBottom: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 8,
    marginBottom: 16,
  },
  repoCard: {
    marginBottom: 30,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  repoIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  repoName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif',
  },
  repoPath: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif',
  },
  emptyRepoCard: {
    height: 100,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  emptyRepoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'GeistMono' : 'monospace',
    marginTop: 8,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionItem: {
    width: (width - 52) / 2,
    marginBottom: 12,
  },
  actionGlass: {
    padding: 20,
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'GeistMono' : 'monospace',
    marginTop: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  actionSubText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif',
    marginTop: 4,
  },
});
