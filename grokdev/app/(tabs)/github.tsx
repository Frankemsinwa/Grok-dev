import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert, StyleSheet } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useRepoStore, Repository } from '../../store/repoStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Font, Radius, Spacing, Shadows } from '../../constants/theme';

import { API_BASE_URL } from '../../constants/Config';

export default function GitHubScreen() {
  const { token } = useAuthStore();
  const { currentRepo, setCurrentRepo } = useRepoStore();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/repos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        if (Array.isArray(data)) {
          setRepos(data);
        } else {
          console.error('Expected array of repos, got:', data);
          Alert.alert('Error', 'Received invalid repository data.');
        }
      } else {
        console.error('Fetch repos failed:', data);
        Alert.alert('Fetch Error', data.error || 'Failed to retrieve repositories from GitHub.');
      }
    } catch (error: any) {
      console.error('Error fetching repos:', error);
      Alert.alert('Network Error', 'Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectRepo = (repo: Repository) => {
    if (navigatingTo) return;
    setNavigatingTo(repo.id.toString());

    setTimeout(() => {
      setCurrentRepo(repo);
      router.push('/(tabs)/explorer');
      setTimeout(() => setNavigatingTo(null), 500);
    }, 10);
  };

  const renderItem = ({ item }: { item: Repository }) => {
    const isSelected = currentRepo?.id === item.id;

    return (
      <TouchableOpacity
        onPress={() => handleSelectRepo(item)}
        activeOpacity={0.7}
        style={[
          styles.repoCard,
          (isSelected || navigatingTo === item.id.toString()) && styles.repoCardSelected,
        ]}
      >
        <View style={[styles.repoIconBox, isSelected && styles.repoIconBoxSelected]}>
          {navigatingTo === item.id.toString() ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <Ionicons name="logo-github" size={22} color={isSelected ? Colors.accent : Colors.textMuted} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.repoName}>{item.name}</Text>
          <Text style={styles.repoOwner}>{item.owner.login}</Text>
        </View>
        {isSelected && (
          <View style={styles.activePill}>
            <Text style={styles.activePillText}>Current</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginLeft: Spacing.sm }} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Repositories</Text>
            <Text style={styles.headerSubtitle}>Select a repo to browse and chat about</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInner}>
            <Ionicons name="search" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search repositories..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
          </View>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        ) : (
          <FlatList
            data={filteredRepos}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="folder-open-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No repositories found</Text>
              </View>
            }
            onRefresh={fetchRepos}
            refreshing={loading}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Font.sizeXXL,
    fontWeight: '700',
    fontFamily: Font.sans,
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: Font.sizeMD,
    fontFamily: Font.sans,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    marginLeft: Spacing.md,
    fontSize: Font.sizeMD,
    fontFamily: Font.sans,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },
  repoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  repoCardSelected: {
    borderColor: Colors.accent,
    borderWidth: 1.5,
  },
  repoIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  repoIconBoxSelected: {
    borderColor: Colors.accent,
  },
  repoName: {
    color: Colors.textPrimary,
    fontSize: Font.sizeLG,
    fontWeight: '600',
    fontFamily: Font.sans,
  },
  repoOwner: {
    color: Colors.textSecondary,
    fontSize: Font.sizeSM,
    fontFamily: Font.sans,
    marginTop: 2,
  },
  activePill: {
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  activePillText: {
    color: Colors.accent,
    fontSize: Font.sizeXS,
    fontWeight: '600',
    fontFamily: Font.sans,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: Font.sizeMD,
    fontFamily: Font.sans,
    marginTop: Spacing.md,
  },
});
