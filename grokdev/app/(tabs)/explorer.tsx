import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, Alert, Platform, SafeAreaView, FlatList, StyleSheet, InteractionManager } from 'react-native';
import { FlashList } from '@shopify/flash-list';
const FList = FlashList as any;
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../store/authStore';
import { useRepoStore } from '../../store/repoStore';
import { useFileStore, detectLanguage, getLanguageColor } from '../../store/fileStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Starfield from '../../components/Starfield';
import { Image } from 'react-native';

const GROK_LOGO = require('../../assets/Grok-trans.png');
const FileSystem: any = require('expo-file-system/legacy');

import { API_BASE_URL } from '../../constants/Config';

// Map file extensions to icon & color
function getFileIcon(fileName: string): { icon: string; color: string } {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const lang = detectLanguage(fileName);
  const color = getLanguageColor(lang);

  const iconMap: Record<string, string> = {
    ts: 'logo-javascript',
    tsx: 'logo-react',
    js: 'logo-javascript',
    jsx: 'logo-react',
    json: 'code-slash',
    md: 'reader',
    html: 'logo-html5',
    css: 'logo-css3',
    py: 'logo-python',
    yml: 'settings',
    yaml: 'settings',
    env: 'key',
    lock: 'lock-closed',
    gitignore: 'git-branch',
    svg: 'image',
    png: 'image',
    jpg: 'image',
    jpeg: 'image',
    gif: 'image',
    webp: 'image',
    ico: 'image',
  };

  return {
    icon: iconMap[ext] || 'document-text',
    color,
  };
}

export default function ExplorerScreen() {
  const { token } = useAuthStore();
  const { currentRepo, currentBranch, setCurrentBranch } = useRepoStore();
  const { setCurrentFile } = useFileStore();
  const router = useRouter();
  const [tree, setTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [cloneLoading, setCloneLoading] = useState(false);

  // Branch switcher state
  const [branches, setBranches] = useState<any[]>([]);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchesLoading, setBranchesLoading] = useState(false);

  // Fetch branches list when repo changes
  useEffect(() => {
    if (currentRepo && token) {
      const task = InteractionManager.runAfterInteractions(() => {
        fetchBranches();
      });
      return () => task.cancel();
    }
  }, [currentRepo, token]);

  // Re-fetch tree whenever repo OR branch changes
  useEffect(() => {
    if (currentRepo) {
      setCurrentPath(''); // Reset path on branch change
      setTree([]);
      const task = InteractionManager.runAfterInteractions(() => {
        fetchTree();
        checkIfCloned();
      });
      return () => task.cancel();
    }
  }, [currentRepo, currentBranch]);

  const fetchBranches = async () => {
    if (!currentRepo) return;
    try {
      setBranchesLoading(true);
      const res = await fetch(
        `${API_BASE_URL}/repos/${currentRepo.owner.login}/${currentRepo.name}/branches`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) setBranches(data);
    } catch (e) {
      console.warn('Failed to fetch branches', e);
    } finally {
      setBranchesLoading(false);
    }
  };

  const handleBranchSwitch = (branchName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentBranch(branchName);
    setShowBranchModal(false);
  };

  const checkIfCloned = async () => {
    if (!currentRepo) return;
    const repoDir = `${FileSystem.documentDirectory}${currentRepo.owner.login}/${currentRepo.name}`;
    const info = await FileSystem.getInfoAsync(repoDir);
    if (info.exists) {
      setIsLocalMode(true);
    } else {
      setIsLocalMode(false);
    }
  };

  const fetchTree = async () => {
    if (!currentRepo) return;
    try {
      setLoading(true);
      const branchParam = currentBranch ? `?branch=${encodeURIComponent(currentBranch)}` : '';
      const response = await fetch(
        `${API_BASE_URL}/repos/${currentRepo.owner.login}/${currentRepo.name}/tree${branchParam}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (response.ok) {
        setTree(data);
      }
    } catch (error) {
      console.error('Error fetching tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloneRepo = async () => {
    if (!currentRepo) return;
    setCloneLoading(true);
    try {
      const repoDir = `${FileSystem.documentDirectory}${currentRepo.owner.login}/${currentRepo.name}`;
      await FileSystem.makeDirectoryAsync(repoDir, { intermediates: true });
      Alert.alert('Clone Mode', 'Initializing local cache for offline access...');
      setIsLocalMode(true);
      Alert.alert('Success', 'Repository cloned to device storage!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to clone repository');
    } finally {
      setCloneLoading(false);
    }
  };

  const handleFilePress = async (item: any) => {
    if (!currentRepo) return;
    const path = item.path;
    try {
      setFileLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Try local first
      if (isLocalMode) {
        const repoDir = `${FileSystem.documentDirectory}${currentRepo.owner.login}/${currentRepo.name}`;
        const localPath = `${repoDir}/${path}`;
        const info = await FileSystem.getInfoAsync(localPath);
        if (info.exists) {
          const content = await FileSystem.readAsStringAsync(localPath);
          const language = detectLanguage(path);
          setCurrentFile({ path, content, language });
          setFileLoading(false);
          router.push('/editor');
          return;
        }
      }

      // Fetch from API
      const branchParam = currentBranch ? `&branch=${encodeURIComponent(currentBranch)}` : '';
      const response = await fetch(
        `${API_BASE_URL}/repos/${currentRepo.owner.login}/${currentRepo.name}/file?path=${path}${branchParam}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (response.ok) {
        const language = detectLanguage(path);
        setCurrentFile({
          path,
          content: data.content,
          sha: data.sha,
          language,
        });

        // Cache locally if in local mode
        if (isLocalMode) {
          const repoDir = `${FileSystem.documentDirectory}${currentRepo.owner.login}/${currentRepo.name}`;
          const localPath = `${repoDir}/${path}`;
          const parentDir = localPath.substring(0, localPath.lastIndexOf('/'));
          await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });
          await FileSystem.writeAsStringAsync(localPath, data.content);
        }

        // Navigate to editor screen
        router.push('/editor');
      }
    } catch (error) {
      console.error('Error fetching file content:', error);
      Alert.alert('Error', 'Could not open file');
    } finally {
      setFileLoading(false);
    }
  };

  const copyToClipboard = async (path: string) => {
    await Clipboard.setStringAsync(path);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const filteredTree = useMemo(() => {
    return tree.filter(item => {
      if (currentPath === '') {
        return !item.path.includes('/');
      } else {
        return item.path.startsWith(`${currentPath}/`) &&
               !item.path.substring(currentPath.length + 1).includes('/');
      }
    }).sort((a: any, b: any) => {
      if (a.type === 'tree' && b.type !== 'tree') return -1;
      if (a.type !== 'tree' && b.type === 'tree') return 1;
      return a.path.localeCompare(b.path);
    });
  }, [tree, currentPath]);

  const navigateTo = (item: any) => {
    if (item.type === 'tree') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentPath(item.path);
    } else {
      handleFilePress(item);
    }
  };

  const goBack = () => {
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/'));
  };

  if (!currentRepo) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 20 }}>
        <Starfield />
        <Ionicons name="logo-github" size={64} color="#1e293b" />
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 24, textAlign: 'center', letterSpacing: 2 }}>NO REPOSITORY MOUNTED</Text>
        <Text style={{ color: '#64748b', marginTop: 12, textAlign: 'center', fontSize: 14, lineHeight: 22 }}>Initialize a workspace uplink via the GitHub tab to browse files.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Starfield />
      
      {/* Header */}
      <SafeAreaView style={{ backgroundColor: 'transparent' }}>
        <View style={styles.header}>
            <Image source={GROK_LOGO} style={styles.headerLogo} resizeMode="contain" />
            
            <View style={{ flex: 1, alignItems: 'center' }}>
                <TouchableOpacity
                    onPress={() => setShowBranchModal(true)}
                    style={styles.branchBtn}
                >
                    <Ionicons name="git-branch" size={14} color="#FFFFFF" />
                    <Text style={styles.branchBtnText} numberOfLines={1}>
                        {(currentBranch || currentRepo.default_branch || 'main').toUpperCase()}
                    </Text>
                    <Ionicons name="chevron-down" size={12} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {!isLocalMode && (
                    <TouchableOpacity
                    onPress={handleCloneRepo}
                    style={styles.iconBtn}
                    >
                    {cloneLoading
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Ionicons name="cloud-download-outline" size={20} color="#fff" />
                    }
                    </TouchableOpacity>
                )}
                <View style={[styles.modeIndicator, { backgroundColor: isLocalMode ? '#4ade80' : '#FFFFFF' }]} />
            </View>
        </View>
      </SafeAreaView>

      {/* Breadcrumb / Path Navigation */}
      <View style={styles.breadcrumbArea}>
        <TouchableOpacity onPress={() => setCurrentPath('')} style={styles.homeBtn}>
          <Ionicons name="home" size={16} color={currentPath === '' ? '#fff' : '#475569'} />
        </TouchableOpacity>
        {currentPath !== '' && (
          <>
            <Ionicons name="chevron-forward" size={14} color="#1e293b" style={{ marginRight: 8 }} />
            <Text style={styles.pathText} numberOfLines={1}>
              {currentPath.toUpperCase()}
            </Text>
            <TouchableOpacity onPress={goBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 50 }} />
      ) : (
        <FList
          data={filteredTree}
          keyExtractor={(item: any) => item.path}
          estimatedItemSize={60}
          renderItem={({ item }: { item: any }) => {
            const isDir = item.type === 'tree';
            const fileName = currentPath === '' ? item.path : item.path.substring(currentPath.length + 1);
            const fileInfo = !isDir ? getFileIcon(fileName) : null;

            return (
              <TouchableOpacity
                onPress={() => navigateTo(item)}
                activeOpacity={0.7}
                style={styles.treeItem}
              >
                <View style={[styles.treeIconBox, { backgroundColor: isDir ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)' }]}>
                  <Ionicons
                    name={isDir ? 'folder' : (fileInfo?.icon as any) || 'document-text'}
                    size={isDir ? 18 : 16}
                    color={isDir ? '#FFFFFF' : (fileInfo?.color || '#475569')}
                  />
                </View>
                <Text style={styles.treeItemText} numberOfLines={1}>{fileName}</Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <TouchableOpacity 
                    onPress={() => copyToClipboard(item.path)}
                    style={styles.copyBtn}
                    >
                    <Ionicons name="copy-outline" size={14} color="#64748b" />
                    </TouchableOpacity>

                    <Ionicons 
                        name={isDir ? 'chevron-forward' : 'open-outline'} 
                        size={14} 
                        color="#1e293b" 
                    />
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingBottom: 100 }}
          onRefresh={fetchTree}
          refreshing={loading}
          ListEmptyComponent={() => (
            <View style={{ marginTop: 100, alignItems: 'center' }}>
              <Text style={{ color: '#64748b' }}>Empty directory</Text>
            </View>
          )}
        />
      )}

      {/* Branch Selection Modal */}
      <Modal visible={showBranchModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>SWITCH BRANCH</Text>
                <Text style={styles.modalSubtitle}>{currentRepo.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBranchModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {branchesLoading ? (
              <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={branches}
                keyExtractor={(item) => item.name}
                renderItem={({ item }) => {
                  const isActive = (currentBranch || currentRepo.default_branch) === item.name;
                  return (
                    <TouchableOpacity
                      onPress={() => handleBranchSwitch(item.name)}
                      style={[styles.branchItem, isActive && styles.branchItemActive]}
                    >
                      <Ionicons
                        name="git-branch"
                        size={18}
                        color={isActive ? '#FFFFFF' : '#64748b'}
                        style={{ marginRight: 14 }}
                      />
                      <Text style={[styles.branchItemText, isActive && styles.branchItemTextActive]}>
                        {item.name}
                      </Text>
                      {isActive && (
                        <View style={styles.activePill}>
                          <Text style={styles.activePillText}>ACTIVE</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={() => (
                  <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <Text style={{ color: '#64748b' }}>No branches found</Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* File Loading Overlay */}
      {fileLoading && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          justifyContent: 'center', alignItems: 'center',
        }}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={{ color: '#94a3b8', marginTop: 12, fontSize: 13, letterSpacing: 1 }}>LOADING FILE...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerLogo: {
    width: 100,
    height: 40,
  },
  repoName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 12,
  },
  modeLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  branchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  branchBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  iconBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    width: 36,
    height: 36,
    borderRadius: 8,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breadcrumbArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  homeBtn: {
    marginRight: 8,
  },
  pathText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    flex: 1,
  },
  backBtn: {
    marginLeft: 8,
  },
  treeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  treeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  treeItemText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  copyBtn: {
    padding: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '55%',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  modalSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  branchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  branchItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  branchItemText: {
    color: '#94a3b8',
    fontSize: 15,
    flex: 1,
  },
  branchItemTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  activePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
