import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useDiffStore } from '../store/diffStore';
import { useAuthStore } from '../store/authStore';
import { useRepoStore } from '../store/repoStore';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as diff from 'diff';

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
    // Wait for the navigation transition to complete before calculating heavy diffs
    const timer = setTimeout(() => setIsReady(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const acceptedProposals = proposals.filter(p => p.accepted);

  if (proposals.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="documents-outline" size={64} color="#1e293b" />
        <Text style={{ color: '#fff', fontSize: 18, marginTop: 20 }}>No pending changes</Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={{ backgroundColor: '#A855F7', padding: 12, borderRadius: 8, marginTop: 20 }}
        >
          <Text style={{ color: '#fff' }}>Go Back</Text>
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
      <View key={index} style={{ 
        backgroundColor: part.added ? '#064e3b' : part.removed ? '#7f1d1d' : 'transparent',
        paddingHorizontal: 8,
        paddingVertical: 2
      }}>
        <Text style={{ 
          color: part.added ? '#4ade80' : part.removed ? '#fca5a1' : '#cbd5e1',
          fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
          fontSize: 12
        }}>
          {part.added ? '+' : part.removed ? '-' : ' '} {part.value}
        </Text>
      </View>
    ));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <View style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: '#1e293b', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Review Changes</Text>
          <Text style={{ color: '#94a3b8', fontSize: 12 }}>{acceptedProposals.length} of {proposals.length} accepted</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {!isReady ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
            <ActivityIndicator size="large" color="#A855F7" />
            <Text style={{ color: '#fff', marginTop: 15 }}>Computing differences...</Text>
          </View>
        ) : (
          proposals.map((proposal, index) => (
            <View key={index} style={{ 
              margin: 15, 
              backgroundColor: '#1e293b', 
              borderRadius: 8, 
              overflow: 'hidden',
              borderWidth: proposal.accepted ? 2 : 0,
              borderColor: '#4ade80'
            }}>
              <View style={{ 
                padding: 12, 
                backgroundColor: proposal.accepted ? '#064e3b' : '#334155', 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {proposal.accepted && <Ionicons name="checkmark-circle" size={16} color="#4ade80" style={{ marginRight: 6 }} />}
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{proposal.path}</Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity onPress={() => rejectProposal(proposal.path)} style={{ marginRight: 15 }}>
                    <Ionicons name="trash-outline" size={20} color="#f87171" />
                  </TouchableOpacity>
                  {!proposal.accepted && (
                    <TouchableOpacity onPress={() => acceptProposal(proposal.path)}>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#4ade80" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <View style={{ padding: 10 }}>
                {renderUnifiedDiff(proposal.oldContent, proposal.newContent)}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: '#1e293b' }}>
        <TouchableOpacity 
          onPress={handleCommitAll}
          disabled={loading || acceptedProposals.length === 0}
          style={{ 
            backgroundColor: '#A855F7', 
            padding: 15, 
            borderRadius: 8, 
            alignItems: 'center',
            opacity: (loading || acceptedProposals.length === 0) ? 0.6 : 1
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
              Push Accepted Changes ({acceptedProposals.length})
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
