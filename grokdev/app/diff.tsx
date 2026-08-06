import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useDiffStore } from '../store/diffStore';
import { useAuthStore } from '../store/authStore';
import { useRepoStore } from '../store/repoStore';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as diff from 'diff';
import { Colors, Font, Radius, Spacing, Shadows } from '../constants/theme';

import { API_BASE_URL } from '../constants/Config';

export default function DiffViewerScreen() {
  const { proposals, acceptProposal, rejectProposal, clearProposals, activeBranch } = useDiffStore();
  const { token } = useAuthStore();
  const { currentRepo, currentBranch } = useRepoStore();
  const router = useRouter();
  const targetBranch = activeBranch || currentBranch;
  const [loading, setLoading] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const acceptedProposals = proposals.filter(p => p.accepted);

  if (proposals.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Ionicons name="documents-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>No pending changes</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.emptyBackBtn}
        >
          <Text style={styles.emptyBackText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleCommitAll = async () => {
    if (!currentRepo) return;
    if (acceptedProposals.length === 0) {
      Alert.alert('No Accepted Changes', 'Please accept at least one change before committing.');
      return;
    }

    Alert.alert(
      'Push Changes',
      `You are about to push ${acceptedProposals.length} file(s) to branch "${targetBranch}"${activeBranch ? ' (AI feature branch)' : ''}. Proceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Push',
          onPress: async () => {
            setLoading(true);
            try {
              for (const proposal of acceptedProposals) {
                console.log('[DEBUG] Committing:', proposal.path, 'with SHA:', proposal.sha);
                const response = await fetch(`${API_BASE_URL}/repos/${currentRepo.owner.login}/${currentRepo.name}/commit`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    path: proposal.path,
                    content: proposal.newContent,
                    message: `Update ${proposal.path} via GrokDev`,
                    sha: proposal.sha,
                    branch: targetBranch
                  }),
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  console.log('[DEBUG] Commit error response:', errorData);
                  throw new Error(`Failed to commit ${proposal.path}: ${errorData.error || errorData.message}`);
                } else {
                  console.log('[DEBUG] Commit successful for:', proposal.path);
                }
              }

              Alert.alert('Success', 'All changes pushed successfully');
              clearProposals();
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to push changes');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderUnifiedDiff = (oldText: string, newText: string) => {
    const changes = diff.diffLines(oldText, newText);

    return changes.map((part, index) => (
      <View
        key={index}
        style={{
          backgroundColor: part.added ? 'rgba(63, 185, 80, 0.12)' : part.removed ? 'rgba(248, 81, 73, 0.12)' : 'transparent',
          paddingHorizontal: Spacing.sm,
          paddingVertical: 2,
        }}
      >
        <Text style={{
          color: part.added ? '#4ade80' : part.removed ? '#fca5a1' : Colors.textSecondary,
          fontFamily: Font.mono,
          fontSize: Font.sizeSM,
        }}>
          {part.added ? '+' : part.removed ? '-' : ' '} {part.value}
        </Text>
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Review Changes</Text>
          <Text style={styles.headerSubtitle}>{acceptedProposals.length} of {proposals.length} accepted</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {!isReady ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.loadingText}>Computing differences...</Text>
          </View>
        ) : (
          proposals.map((proposal, index) => (
            <View
              key={index}
              style={[
                styles.proposalCard,
                proposal.accepted && styles.proposalCardAccepted,
              ]}
            >
              <View style={[styles.proposalHeader, proposal.accepted && styles.proposalHeaderAccepted]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  {proposal.accepted && <Ionicons name="checkmark-circle" size={16} color={Colors.success} style={{ marginRight: 6 }} />}
                  <Text style={styles.proposalPath} numberOfLines={1}>{proposal.path}</Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity onPress={() => rejectProposal(proposal.path)} style={{ marginRight: 15 }}>
                    <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                  </TouchableOpacity>
                  {!proposal.accepted && (
                    <TouchableOpacity onPress={() => acceptProposal(proposal.path)}>
                      <Ionicons name="checkmark-circle-outline" size={20} color={Colors.success} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <View style={styles.diffBody}>
                {renderUnifiedDiff(proposal.oldContent, proposal.newContent)}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleCommitAll}
          disabled={loading || acceptedProposals.length === 0}
          style={[styles.pushBtn, (loading || acceptedProposals.length === 0) && { opacity: 0.6 }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.pushBtnText}>
              Push Accepted Changes ({acceptedProposals.length})
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: Font.sizeXL,
    fontWeight: '600',
    fontFamily: Font.sans,
    marginTop: Spacing.lg,
  },
  emptyBackBtn: {
    backgroundColor: Colors.accent,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.xl,
  },
  emptyBackText: {
    color: '#fff',
    fontWeight: '600',
    fontFamily: Font.sans,
  },
  header: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Font.sizeXL,
    fontWeight: '600',
    fontFamily: Font.sans,
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: Font.sizeSM,
    fontFamily: Font.sans,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: Colors.textPrimary,
    marginTop: 15,
    fontFamily: Font.sans,
  },
  proposalCard: {
    margin: 15,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  proposalCardAccepted: {
    borderColor: Colors.success,
  },
  proposalHeader: {
    padding: Spacing.md,
    backgroundColor: Colors.surfaceMuted,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  proposalHeaderAccepted: {
    backgroundColor: 'rgba(63, 185, 80, 0.1)',
  },
  proposalPath: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: Font.sizeMD,
    fontFamily: Font.sans,
  },
  diffBody: {
    padding: 10,
  },
  footer: {
    padding: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pushBtn: {
    backgroundColor: Colors.accent,
    padding: 15,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  pushBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: Font.sizeLG,
    fontFamily: Font.sans,
  },
});
