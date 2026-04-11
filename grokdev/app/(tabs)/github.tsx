import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useRepoStore, Repository } from '../../store/repoStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Starfield from '../../components/Starfield';
import { SafeAreaView, Image, StyleSheet, Platform, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const GROK_LOGO = require('../../assets/Grok-trans.png');

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
          Alert.alert('LINK ERROR', 'Received invalid repository data from the matrix.');
        }
      } else {
        console.error('Fetch repos failed:', data);
        Alert.alert('FETCH ERROR', data.error || 'Failed to retrieve repositories from GitHub.');
      }
    } catch (error: any) {
      console.error('Error fetching repos:', error);
      Alert.alert('NETWORK ERROR', 'Could not connect to the neural server.');
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
        // Reset navigating state after an arbitrary timeframe when transition completes
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
            navigatingTo && navigatingTo !== item.id.toString() && { opacity: 0.5 }
        ]}
      >
        <View style={styles.repoIconBox}>
            {navigatingTo === item.id.toString() ? (
                <ActivityIndicator size="small" color="#fff" />
            ) : (
                <Ionicons name="logo-github" size={24} color={isSelected ? '#fff' : '#475569'} />
            )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.repoName, isSelected && { color: '#fff' }]}>{item.name.toUpperCase()}</Text>
          <Text style={styles.repoOwner}>{item.owner.login.toUpperCase()}</Text>
        </View>
        {isSelected && (
            <View style={styles.activePill}>
                <Text style={styles.activePillText}>MOUNTED</Text>
            </View>
        )}
        <Ionicons name="chevron-forward" size={16} color="#1e293b" style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Starfield />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
            <Image source={GROK_LOGO} style={styles.headerLogo} resizeMode="contain" />
            <View style={styles.headerRight}>
                <View style={[styles.livePulse, { backgroundColor: '#FFFFFF', shadowColor: '#FFFFFF' }]} />
                <Text style={styles.statusText}>WORKSPACES</Text>
            </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
            <View style={styles.searchInner}>
                <Ionicons name="search" size={18} color="#475569" />
                <TextInput 
                    style={styles.searchInput}
                    placeholder="SEARCH REPOSITORIES..."
                    placeholderTextColor="#475569"
                    value={search}
                    onChangeText={setSearch}
                    autoCapitalize="characters"
                />
            </View>
        </View>
        
        {loading ? (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
        ) : (
            <FlatList
                data={filteredRepos}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>NO COMPATIBLE REPOSITORIES FOUND</Text>
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
        backgroundColor: '#000',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 10 : 20,
        paddingBottom: 20,
    },
    headerLogo: {
        width: 100,
        height: 40,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    livePulse: {
        width: 6,
        height: 6,
        borderRadius: 3,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 5,
    },
    searchContainer: {
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    searchInner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        marginLeft: 12,
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 1,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    repoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    repoCardSelected: {
        borderBottomColor: 'rgba(255, 255, 255, 0.3)',
    },
    repoIconBox: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    repoName: {
        color: '#94a3b8',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    repoOwner: {
        color: '#475569',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        marginTop: 2,
    },
    activePill: {
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.2)',
    },
    activePillText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
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
        color: '#475569',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
});
