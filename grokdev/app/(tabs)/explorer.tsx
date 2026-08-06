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
import { Colors, Font, Radius, Spacing } from '../../constants/theme';

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
      setCurrentPath('');
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
      <View style={[styles.container, styles.emptyContainer]}>
        <Ionicons name="logo-github" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>No repository selected</Text>
        <Text style={styles.emptySubtitle}>
          Connect a repository from the Repos tab to browse files.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.repoTitle} numberOfLines={1}>
              {currentRepo.name}
            </Text>
            <Text style={styles.repoOwner} numberOfLines={1}>
              {currentRepo.owner.login} · {currentBranch || currentRepo.default_branch || 'main'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowBranchModal(true)}
            style={styles.branchBtn}
          >
            <Ionicons name="git-branch" size={14} color={Colors.textSecondary} />
            <Text style={styles.branchBtnText} numberOfLines={1}>
              {currentBranch || currentRepo.default_branch || 'main'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={Colors.textSecondary} />
          </TouchableOpacity>

          {!isLocalMode && (
            <TouchableOpacity onPress={handleCloneRepo} style={styles.iconBtn}>
              {cloneLoading
                ? <ActivityIndicator size="small" color={Colors.textSecondary} />
                : <Ionicons name="cloud-download-outline" size={20} color={Colors.textSecondary} />
              }
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* Breadcrumb / Path Navigation */}
      <View style={styles.breadcrumbArea}>
        <TouchableOpacity onPress={() => setCurrentPath('')} style={styles.homeBtn}>
          <Ionicons name="home" size={16} color={currentPath === '' ? Colors.accent : Colors.textMuted} />
        </TouchableOpacity>
        {currentPath !== '' && (
          <>
            <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} style={{ marginRight: Spacing.sm }} />
            <Text style={styles.pathText} numberOfLines={1}>
              {currentPath}
            </Text>
            <TouchableOpacity onPress={goBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={16} color={Colors.textPrimary} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 50 }} />
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
                <View style={styles.treeIconBox}>
                  <Ionicons
                    name={isDir ? 'folder' : (fileInfo?.icon as any) || 'document-text'}
                    size={isDir ? 18 : 16}
                    color={isDir ? Colors.accent : (fileInfo?.color || Colors.textMuted)}
                  />
                </View>
                <Text style={styles.treeItemText} numberOfLines={1}>{fileName}</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(item.path)}
                    style={styles.copyBtn}
                  >
                    <Ionicons name="copy-outline" size={14} color={Colors.textMuted} />
                  </TouchableOpacity>
                  <Ionicons
                    name={isDir ? 'chevron-forward' : 'open-outline'}
                    size={14}
                    color={Colors.textMuted}
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
              <Text style={{ color: Colors.textMuted }}>Empty directory</Text>
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
                <Text style={styles.modalTitle}>Switch branch</Text>
                <Text style={styles.modalSubtitle}>{currentRepo.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBranchModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {branchesLoading ? (
              <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 40 }} />
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
                        color={isActive ? Colors.accent : Colors.textMuted}
                        style={{ marginRight: 14 }}
                      />
                      <Text style={[styles.branchItemText, isActive && styles.branchItemTextActive]}>
                        {item.name}
                      </Text>
                      {isActive && (
                        <View style={styles.activePill}>
                          <Text style={styles.activePillText}>Active</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={() => (
                  <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <Text style={{ color: Colors.textMuted }}>No branches found</Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* File Loading Overlay */}
      {fileLoading && (
        <View style={styles.fileOverlay}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.fileOverlayText}>Loading file...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: Font.sizeLG,
    fontWeight: '600',
    fontFamily: Font.sans,
    marginTop: Spacing.xl,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: Font.sizeMD,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  repoTitle: {
    color: Colors.textPrimary,
    fontSize: Font.sizeXL,
    fontWeight: '700',
    fontFamily: Font.sans,
  },
  repoOwner: {
    color: Colors.textSecondary,
    fontSize: Font.sizeSM,
    fontFamily: Font.sans,
    marginTop: 2,
  },
  branchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  branchBtnText: {
    color: Colors.textPrimary,
    fontSize: Font.sizeSM,
    fontWeight: '600',
    fontFamily: Font.sans,
    maxWidth: 90,
  },
  iconBtn: {
    backgroundColor: Colors.surface,
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    borderColor: Colors.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breadcrumbArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  homeBtn: {
    marginRight: Spacing.sm,
  },
  pathText: {
    color: Colors.textSecondary,
    fontSize: Font.sizeSM,
    fontFamily: Font.mono,
    flex: 1,
  },
  backBtn: {
    marginLeft: Spacing.sm,
  },
  treeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  treeIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  treeItemText: {
    color: Colors.textPrimary,
    fontSize: Font.sizeMD,
    fontWeight: '500',
    fontFamily: Font.sans,
    flex: 1,
  },
  copyBtn: {
    padding: Spacing.sm,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xxl,
    maxHeight: '55%',
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: Font.sizeLG,
    fontWeight: '600',
    fontFamily: Font.sans,
  },
  modalSubtitle: {
    color: Colors.textSecondary,
    fontSize: Font.sizeSM,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  branchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
  },
  branchItemActive: {
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  branchItemText: {
    color: Colors.textSecondary,
    fontSize: Font.sizeMD,
    fontFamily: Font.sans,
    flex: 1,
  },
  branchItemTextActive: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  activePill: {
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  activePillText: {
    color: Colors.accent,
    fontSize: Font.sizeXS,
    fontWeight: '600',
    fontFamily: Font.sans,
  },
  fileOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(11, 13, 16, 0.9)',
    justifyContent: 'center', alignItems: 'center',
  },
  fileOverlayText: {
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    fontSize: Font.sizeMD,
    fontFamily: Font.sans,
  },
});
