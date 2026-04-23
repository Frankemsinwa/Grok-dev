import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, Alert, StyleSheet, Dimensions, Modal, Image, InteractionManager } from 'react-native';
const expoFetch = fetch;
import Markdown from 'react-native-markdown-display';
import { useAuthStore } from '../../../store/authStore';
import { useRepoStore } from '../../../store/repoStore';
import { useModelStore, MODEL_OPTIONS, type ModelOption } from '../../../store/modelStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDiffStore } from '../../../store/diffStore';
import Starfield from '../../../components/Starfield';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import Animated, { 
  FadeInDown, 
  FadeInRight, 
  FadeIn,
  FadeOut,
  Layout, 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withTiming,
  Easing
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
import { API_BASE_URL } from '../../../constants/Config';

const GlassBox = ({ children, style, intensity = 25 }: { children: React.ReactNode, style?: any, intensity?: number }) => (
    <View style={[styles.glass, style]}>
        {Platform.OS === 'ios' ? (
            <BlurView intensity={intensity} tint="dark" style={styles.blur}>
                {children}
            </BlurView>
        ) : (
            <View style={[styles.blur, { backgroundColor: 'rgba(15, 23, 42, 0.8)' }]}>
                {children}
            </View>
        )}
    </View>
);

const MessageBubble = React.memo(({ item, isUser, messages, setProposal, router, providerLabel, providerColor, currentRepo, currentBranch, token }: any) => {
    const hasToolCalls = item.toolCalls && item.toolCalls.length > 0;
    const [showCopied, setShowCopied] = useState(false);

    const handleCopy = async () => {
        if (!item.content) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await Clipboard.setStringAsync(item.content);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
    };
    
    return (
      <Animated.View 
        entering={isUser ? FadeInRight.springify() : FadeInDown.springify()}
        layout={Layout.springify()}
        style={[
            styles.messageWrapper,
            { alignItems: isUser ? 'flex-end' : 'flex-start' }
        ]}
      >
        {showCopied && (
            <Animated.View 
                entering={FadeInDown} 
                exiting={FadeOut}
                style={[styles.copiedBadge, { backgroundColor: providerColor }]}
            >
                <Text style={styles.copiedText}>COPIED</Text>
            </Animated.View>
        )}

        {hasToolCalls && item.toolCalls.map((toolCall: any, index: number) => (
          <GlassBox key={`${item.id}-tool-${index}`} style={styles.toolCall} intensity={40}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="flash" size={12} color={providerColor} />
                <Text style={[styles.toolName, { color: providerColor }]}>{toolCall.toolName.toUpperCase()}</Text>
            </View>
            <Text style={{ color: '#94a3b8', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'GeistMono' : 'monospace', letterSpacing: 1 }} numberOfLines={1}>
              {JSON.stringify(toolCall.args)}
            </Text>
            {['get_file_diff', 'write_file', 'create_file'].includes(toolCall.toolName) && (
              <TouchableOpacity 
                onPress={async () => {
                  try {
                    // 1. CONFIRM START
                    console.log('[DIFF] button pressed');

                    // 2. EXTRACT ARGS
                    let argsObj: any = {};
                    if (typeof toolCall.args === 'object' && toolCall.args !== null) {
                      argsObj = toolCall.args;
                    } else if (typeof toolCall.input === 'object' && toolCall.input !== null) {
                      argsObj = toolCall.input;
                    } else if (typeof toolCall.args === 'string' && toolCall.args.startsWith('{')) {
                      try { argsObj = JSON.parse(toolCall.args); } catch (e) {}
                    } else if (typeof toolCall.input === 'string' && toolCall.input.startsWith('{')) {
                      try { argsObj = JSON.parse(toolCall.input); } catch (e) {}
                    }
                    
                    const path = argsObj.path || argsObj.filePath || argsObj.TargetFile;
                    if (!path) {
                      Alert.alert('Missing Path', 'No target file path found in tool calls.');
                      return;
                    }

                    if (toolCall.toolName === 'get_file_diff') {
                      // 3a. FIND TOOL RESULT BY ID (High precision) for get_file_diff
                      let foundTr = null;
                      const targetId = toolCall.toolCallId || toolCall.id;
                      
                      for (const m of (messages || [])) {
                        if (m.role === 'tool' && (m.toolCallId === targetId || m.id === targetId)) {
                          foundTr = m;
                          break;
                        }
                      }

                      // Fallback: search contents for path if ID link is missing
                      if (!foundTr) {
                          for (const m of (messages || [])) {
                            if (m.role === 'tool' && m.content && m.content.includes(path)) {
                              foundTr = m;
                              break;
                            }
                          }
                      }

                      if (foundTr) {
                        let data = foundTr.content;
                        if (typeof data === 'string') {
                            try {
                                const parsed = JSON.parse(data);
                                data = parsed.result !== undefined ? parsed.result : parsed;
                            } catch (e) {}
                        }
                        setProposal(data);
                        router.push('/diff');
                      } else {
                        Alert.alert(
                          'Result Not Ready', 
                          `The tool result for this action is still being synchronized.\n\nPath: ${path}`
                        );
                      }
                    } else {
                      // 3b. For write_file or create_file, build the diff proposal manually
                      const newContent = argsObj.content || argsObj.newContent || '';
                      let oldContent = '';
                      let sha: string | undefined;
                      
                      try {
                        const response = await expoFetch(`${API_BASE_URL}/repos/${currentRepo.owner.login}/${currentRepo.name}/file?path=${encodeURIComponent(path)}&branch=${currentBranch}`, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        if (response.ok) {
                          const result = await response.json();
                          console.log('[DEBUG] File result:', result);
                          oldContent = result.content || '';
                          sha = result.sha;
                        } else {
                          console.log('[DEBUG] File response not ok:', response.status, response.statusText);
                        }
                      } catch (e) {
                         console.warn('Failed to fetch old content', e);
                      }
                      
                        console.log('[DEBUG] Setting proposal with data:', {
                          path,
                          oldContent,
                          newContent,
                          sha
                        });
                        setProposal({ path, oldContent, newContent, sha });
                      router.push('/diff');
                    }
                  } catch (e) {
                    console.error('Diff Button Error:', e);
                    Alert.alert('Engine Error', 'Failed to link with diff processor unit.');
                  }
                }}
                style={[styles.diffButton, { backgroundColor: providerColor }]}
              >
                <Text style={styles.diffButtonText}>REVIEW CHANGES</Text>
              </TouchableOpacity>
            )}
          </GlassBox>
        ))}

        <TouchableOpacity 
            onLongPress={handleCopy}
            activeOpacity={0.9}
            style={[
                styles.bubbleContainer, 
                isUser ? styles.userBubble : [styles.aiBubble, { borderColor: `${providerColor}22` }]
            ]}
        >
            {!isUser && <View style={[styles.aiAccent, { backgroundColor: providerColor }]} />}
            <Markdown style={{
                body: { color: isUser ? '#000' : '#cbd5e1', fontSize: 16, lineHeight: 24, fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif' },
                code_inline: { backgroundColor: `${providerColor}18`, color: providerColor, borderRadius: 4, padding: 3, fontFamily: Platform.OS === 'ios' ? 'GeistMono' : 'monospace' },
                code_block: { backgroundColor: '#000', color: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: `${providerColor}33`, fontFamily: Platform.OS === 'ios' ? 'GeistMono' : 'monospace' },
                fence: { backgroundColor: '#000', color: '#fff', padding: 12, borderRadius: 12 },
                link: { color: providerColor },
                strong: { color: '#fff', fontWeight: 'bold' },
            }}>
                {item.content || (item.role === 'assistant' && !item.content ? "Thinking..." : "")}
            </Markdown>
        </TouchableOpacity>
        <Text style={[styles.timestamp, isUser && { textAlign: 'right' }]}>
            {isUser ? 'USER' : providerLabel} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </Animated.View>
    );
}); // Removed second argument areEqual to force re-renders for debugging

// ─── Gemini API Key Prompt ───────────────────────────────────────────────────
function GeminiKeyModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}) {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={geminiStyles.overlay}>
        <Animated.View entering={FadeInDown.springify()} style={geminiStyles.sheet}>
          {/* Header */}
          <View style={geminiStyles.header}>
            <View style={geminiStyles.headerLeft}>
              <View style={geminiStyles.geminiIcon}>
                <Image source={require('../../../assets/gemini.webp')} style={{ width: 24, height: 24 }} resizeMode="contain" />
              </View>
              <View>
                <Text style={geminiStyles.title}>GEMINI UPLINK</Text>
                <Text style={geminiStyles.subtitle}>Connect your Google AI API key</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={geminiStyles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={geminiStyles.infoBox}>
            <Ionicons name="shield-checkmark" size={16} color="#4ade80" />
            <Text style={geminiStyles.infoText}>
              Your API key is stored locally on this device only. It is never sent to our servers or stored in any database.
            </Text>
          </View>

          {/* Key Input */}
          <Text style={geminiStyles.label}>GOOGLE AI API KEY</Text>
          <View style={geminiStyles.inputRow}>
            <TextInput
              style={geminiStyles.input}
              value={key}
              onChangeText={setKey}
              placeholder="AIzaSy..."
              placeholderTextColor="#334155"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showKey}
            />
            <TouchableOpacity
              onPress={() => setShowKey(!showKey)}
              style={geminiStyles.eyeBtn}
            >
              <Ionicons name={showKey ? 'eye-off' : 'eye'} size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Help Link */}
          <Text style={geminiStyles.helpText}>
            Get your API key from{' '}
            <Text style={{ color: '#4285F4', fontWeight: '700' }}>
              aistudio.google.com
            </Text>
          </Text>

          {/* Save Button */}
          <TouchableOpacity
            onPress={() => {
              if (key.trim().length < 10) {
                Alert.alert('Invalid Key', 'Please enter a valid Google AI API key.');
                return;
              }
              onSave(key.trim());
              setKey('');
            }}
            disabled={key.trim().length < 10}
            style={[
              geminiStyles.saveBtn,
              key.trim().length < 10 && { opacity: 0.4 },
            ]}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={geminiStyles.saveBtnText}>SAVE & ACTIVATE</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const geminiStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  sheet: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(66, 133, 244, 0.25)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  geminiIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(66, 133, 244, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(66, 133, 244, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(74, 222, 128, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  label: {
    color: '#64748b',
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    padding: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  helpText: {
    color: '#475569',
    fontSize: 12,
    marginBottom: 20,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4285F4',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
});

// ─── Model Switcher Modal ────────────────────────────────────────────────────
function ModelSwitcherModal({
  visible,
  onClose,
  selectedModel,
  onSelectModel,
  geminiApiKey,
  onRequestGeminiKey,
}: {
  visible: boolean;
  onClose: () => void;
  selectedModel: ModelOption;
  onSelectModel: (model: ModelOption) => void;
  geminiApiKey: string | null;
  onRequestGeminiKey: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={switcherStyles.overlay}>
        <View style={switcherStyles.sheet}>
          {/* Header */}
          <View style={switcherStyles.header}>
            <View>
              <Text style={switcherStyles.title}>AI ENGINE</Text>
              <Text style={switcherStyles.subtitle}>Select your intelligence unit</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={switcherStyles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Model Options */}
          {MODEL_OPTIONS.map((model) => {
            const isActive = selectedModel.id === model.id;
            const needsKey = model.provider === 'gemini' && !geminiApiKey;

            return (
              <TouchableOpacity
                key={model.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  if (needsKey) {
                    onClose();
                    setTimeout(() => onRequestGeminiKey(), 300);
                    return;
                  }
                  onSelectModel(model);
                  onClose();
                }}
                style={[
                  switcherStyles.modelCard,
                  isActive && { borderColor: model.color, backgroundColor: model.accentColor },
                ]}
              >
                <View style={[switcherStyles.modelIconBox, { backgroundColor: model.accentColor, borderColor: `${model.color}44`, overflow: 'hidden' }]}>
                  <Image source={model.logo} style={{ width: model.logoRound ? 46 : 28, height: model.logoRound ? 46 : 28, borderRadius: model.logoRound ? 23 : 0 }} resizeMode="cover" />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[switcherStyles.modelName, isActive && { color: '#fff' }]}>
                      {model.name}
                    </Text>
                    {needsKey && (
                      <View style={switcherStyles.keyNeededPill}>
                        <Ionicons name="key" size={10} color="#FBBF24" />
                        <Text style={switcherStyles.keyNeededText}>KEY NEEDED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={switcherStyles.modelDesc}>{model.description}</Text>
                </View>

                {isActive ? (
                  <View style={[switcherStyles.activeDot, { backgroundColor: model.color }]}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color="#334155" />
                )}
              </TouchableOpacity>
            );
          })}

          {/* Gemini Key Management */}
          {geminiApiKey && (
            <View style={switcherStyles.keyStatusRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="shield-checkmark" size={14} color="#4ade80" />
                <Text style={switcherStyles.keyStatusText}>Gemini key saved on device</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Remove Gemini Key?',
                    'This will delete the API key from this device and switch back to Grok.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => {
                          const { clearGeminiApiKey } = useModelStore.getState();
                          clearGeminiApiKey();
                          onClose();
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={switcherStyles.removeKeyText}>REMOVE</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const switcherStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 14,
  },
  modelIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  modelName: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '700',
  },
  modelDesc: {
    color: '#475569',
    fontSize: 12,
    marginTop: 2,
  },
  activeDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyNeededPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  keyNeededText: {
    color: '#FBBF24',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  keyStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  keyStatusText: {
    color: '#64748b',
    fontSize: 12,
  },
  removeKeyText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

// ─── Main Chat Screen ────────────────────────────────────────────────────────
export default function ChatScreen() {
  const { token } = useAuthStore();
  const { currentRepo, currentBranch, setCurrentBranch, setCurrentRepo } = useRepoStore();
  const { selectedModel, geminiApiKey, loadGeminiApiKey, setSelectedModel, setGeminiApiKey, isGeminiKeyLoaded } = useModelStore();
  const { setProposal } = useDiffStore();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const { id } = useLocalSearchParams();
  const [conversationId, setConversationId] = useState<string | null>(id !== 'new' ? (id as string) : null);
  const [messageInput, setMessageInput] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showModelSwitcher, setShowModelSwitcher] = useState(false);
  const [showGeminiKeyModal, setShowGeminiKeyModal] = useState(false);
  const [activeStatus, setActiveStatus] = useState('NEURAL PROCESSING...');
  const [activeMotivation, setActiveMotivation] = useState('Syncing mission parameters...');
  const [manualLoading, setManualLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(true);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsNavigating(false);
    });
    return () => task.cancel();
  }, []);

  // Load Gemini key from secure storage on mount
  useEffect(() => {
    if (!isGeminiKeyLoaded) {
      loadGeminiApiKey();
    }
  }, []);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      if (id && id !== 'new') {
        fetchConversation(id as string);
      } else {
        setConversationId(null);
        setMessages([
          { id: '1', role: 'assistant', content: `SYSTEM INITIALIZED: ${selectedModel.name} Agent Ready. I have full context of your repository. What is our objective?` }
        ]);
      }
    });
    return () => task.cancel();
  }, [id, selectedModel.name]);

  const fetchConversation = async (convId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/conversations/${convId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversationId(convId);
        if (data.repo) {
          setCurrentRepo(data.repo);
        }
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
      }
    } catch (e) {
      console.warn('Failed to load conversation', e);
    }
  };

  useEffect(() => {
    if (currentRepo && token) {
      fetchBranches();
    }
  }, [currentRepo, token, currentBranch]);

  const fetchBranches = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/repos/${currentRepo?.owner.login}/${currentRepo?.name}/branches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setBranches(data);
    } catch (e) {
      console.warn('Failed to fetch branches', e);
    }
  };

  const [messages, setMessages] = useState<any[]>([]);

  const handleNewChat = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setConversationId(null);
    setMessages([]);
    router.replace('/chat/new');
  };

  const isLoading = manualLoading;

  const TECH_MOTIVATIONS = [
  "Reticulating splines...",
  "Optimizing neural pathways...",
  "Searching for the perfect semicolon...",
  "Converting coffee to code...",
  "Defragmenting intent buffers...",
  "Bypassing the mainframe logic...",
  "Recalibrated agent priorities...",
  "Consulting the cloud architects...",
  "Generating 1.21 gigawatts of logic...",
  "Syncing with the digital ghost...",
  "Scanning architectural patterns...",
  "Executing heuristic analysis...",
  "Calibrating logic gates...",
  "Initializing autonomous loop...",

  // Added motivations
  "Compiling existential queries...",
  "Refactoring recursive thoughts...",
  "Aligning bits with purpose...",
  "Resolving merge conflicts in reality...",
  "Bootstrapping imagination modules...",
  "Encrypting abstract intentions...",
  "Parsing human unpredictability...",
  "Loading cognitive dependencies...",
  "Resolving asynchronous paradoxes...",
  "Optimizing runtime decisions...",
  "Injecting clarity into chaos...",
  "Indexing fragmented memories...",
  "Normalizing data inconsistencies...",
  "Rewriting legacy assumptions...",
  "Patching logical vulnerabilities...",
  "Balancing load across neurons...",
  "Fetching remote inspiration...",
  "Mapping undefined variables...",
  "Stabilizing quantum branches...",
  "Rehydrating stateful thoughts...",
  "Simulating edge-case scenarios...",
  "Provisioning mental containers...",
  "Debugging invisible errors...",
  "Scaling abstract reasoning...",
  "Caching recent insights...",
  "Streaming consciousness packets...",
  "Rebuilding broken pipelines...",
  "Analyzing behavioral metrics...",
  "Refining algorithmic intuition...",
  "Synchronizing distributed logic...",
  "Resolving dependency chains...",
  "Executing background cognition...",
  "Validating internal schemas...",
  "Testing hypothetical endpoints...",
  "Balancing CPU and creativity...",
  "Compacting memory fragments...",
  "Optimizing perception layers...",
  "Upgrading decision engines...",
  "Profiling mental performance...",
  "Allocating cognitive resources...",
  "Bridging logic and emotion APIs...",
  "Monitoring system entropy...",
  "Resolving infinite loops of thought...",
  "Consolidating redundant ideas...",
  "Generating fallback strategies...",
  "Aligning system clocks with reality...",
  "Expanding neural bandwidth...",
  "Fine-tuning heuristic weights...",
  "Stitching fragmented logic...",
  "Normalizing semantic drift...",
  "Activating insight triggers...",
  "Merging parallel perspectives...",
  "Reconstructing data narratives...",
  "Validating probabilistic outcomes...",
  "Compiling intuition layers...",
  "Optimizing feedback loops...",
  "Simulating future states...",
  "Tracking anomaly signals...",
  "Balancing deterministic flows...",
  "Resolving ambiguity tokens...",
  "Rendering mental models...",
  "Abstracting unnecessary complexity...",
  "Re-indexing knowledge graphs...",
  "Executing decision trees...",
  "Enhancing signal-to-noise ratio...",
  "Stabilizing volatile logic...",
  "Preloading cognitive assets...",
  "Resolving context boundaries...",
  "Recalibrating expectation models...",
  "Orchestrating intelligent workflows..."
];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setActiveMotivation(TECH_MOTIVATIONS[Math.floor(Math.random() * TECH_MOTIVATIONS.length)]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleModelSwitch = (model: ModelOption) => {
    setSelectedModel(model);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setConversationId(null);
    setMessages([
      { id: Date.now().toString(), role: 'assistant', content: `ENGINE SWITCHED: ${model.name} online. Ready to assist.` }
    ]);
  };

  const handleSaveGeminiKey = (key: string) => {
    setGeminiApiKey(key);
    setShowGeminiKeyModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Auto-switch to Gemini Flash after saving key
    const geminiFlash = MODEL_OPTIONS.find(m => m.id === 'gemini-2.0-flash')!;
    handleModelSwitch(geminiFlash);
  };

  // FAIL-SAFE: Manual Engine Link for environments where SDK hooks are partially stripped
  const manualEngineSend = async (content: string) => {
    // Add user message to UI immediately
    const userMsg = { id: Date.now().toString(), role: 'user' as const, content };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg = { id: assistantId, role: 'assistant' as const, content: '⏳ Thinking...' };
    
    setManualLoading(true);
    setActiveStatus('ANALYZING REPOSITORY...');
    
    // Create the cleaned messages array for the API (only role, content, toolCalls, toolCallId)
    const currentPayload = [
        ...messages.map((m: any) => ({ 
            role: m.role, 
            content: m.content,
            toolCalls: m.toolCalls,
            toolCallId: m.toolCallId
        })), 
        { role: 'user', content }
    ];

    setMessages([...messages, userMsg, assistantMsg]);
    
    try {
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId,
          messages: currentPayload,
          repoId: currentRepo?.id,
          repoOwner: currentRepo?.owner?.login,
          repoName: currentRepo?.name,
          branch: currentBranch || currentRepo?.default_branch || 'main',
          model: selectedModel.id,
          provider: selectedModel.provider,
          geminiApiKey: selectedModel.provider === 'gemini' ? geminiApiKey : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Engine rejected request (${response.status})`);
      }

      // Backend now returns JSON: { text, conversationId, toolCalls, toolResults }
      const data = await response.json();
      const fullResponse = data.text || 'The AI processed your request but returned no visible text.';
      
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }
      
      console.log('[CHAT] AI response received:', fullResponse.substring(0, 100), '...');

      // Update UI with the full response and inject the underlying tool communications
      setMessages(prev => {
         const newArr = prev.map(m => 
            m.id === assistantId ? { ...m, content: fullResponse, toolCalls: data.toolCalls } : m
         );
         if (data.toolResults && data.toolResults.length > 0) {
            for (const tr of data.toolResults) {
               newArr.push({ 
                  id: Date.now().toString() + Math.random(), 
                  role: 'tool' as const, 
                  content: JSON.stringify(tr.result || tr),
                  toolCallId: tr.toolCallId // CRITICAL: Link result to its call
               });
            }
         }
         return newArr;
      });
    } catch (e: any) {
      console.error('Manual link failed', e);
      Alert.alert('Console Sync Error', e.message || 'The neural link failed to stabilize.');
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setManualLoading(false);
    }
  };

  const onSend = async () => {
    const textToSend = messageInput.trim();
    if (!textToSend || isLoading) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessageInput('');
    
    try {
        await manualEngineSend(textToSend);
    } catch (e) {
        console.error('Transmission failed', e);
        Alert.alert('Engine Error', `Failed to communicate with ${selectedModel.name}.`);
    }
  };

  // Derived theme values from selected model
  const accentColor = selectedModel.color;
  const providerLabel = selectedModel.name.toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Starfield />
      
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          style={{ flex: 1 }}
        >
          {/* Enhanced Mission Header */}
          <GlassBox style={[styles.header, { borderColor: `${accentColor}22` }]} intensity={40}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity 
                onPress={() => router.replace('/chat')} 
                style={{ paddingRight: 10 }}
              >
                <Ionicons name="chevron-back" size={24} color="#94a3b8" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.livePulse, { backgroundColor: accentColor, shadowColor: accentColor }]} />
                      <Text style={styles.missionText}>MISSION CONSOLE // {providerLabel}</Text>
                  </View>
                  <Text style={styles.headerTitle}>
                      {currentRepo?.name.toUpperCase() || 'OFFLINE'}
                      {currentBranch && ` • ${currentBranch.toUpperCase()}`}
                  </Text>
              </View>
            </View>

            {/* Model Switcher Button */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowModelSwitcher(true);
              }}
              style={[styles.modelBtn, { borderColor: `${accentColor}55`, backgroundColor: `${accentColor}12` }]}
            >
              <Image source={selectedModel.logo} style={{ width: selectedModel.logoRound ? 18 : 14, height: selectedModel.logoRound ? 18 : 14, borderRadius: selectedModel.logoRound ? 9 : 0 }} resizeMode="contain" />
              <Text style={[styles.modelBtnText, { color: accentColor }]} numberOfLines={1}>
                {selectedModel.name}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowBranchModal(true)} style={[styles.refreshBtn, { borderColor: 'rgba(255, 255, 255, 0.2)', marginRight: 6 }]}>
                <Ionicons name="git-branch" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNewChat} style={[styles.refreshBtn, { borderColor: `${accentColor}33` }]}>
                <Ionicons name="reload" size={18} color={accentColor} />
            </TouchableOpacity>
          </GlassBox>

          {isNavigating ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={accentColor} />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages.filter((m: any) => m.role !== 'tool')}
              keyExtractor={(item) => item.id}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={10}
              removeClippedSubviews={Platform.OS === 'android'}
              renderItem={({ item }) => (
                <MessageBubble 
                        item={item} 
                        isUser={item.role === 'user'} 
                        messages={messages} 
                        setProposal={setProposal} 
                        router={router}
                        providerLabel={providerLabel}
                        providerColor={accentColor}
                        currentRepo={currentRepo}
                        currentBranch={currentBranch}
                        token={token}
                    />
              )}
              contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 150 }}
              onContentSizeChange={() => {
                // Only auto-scroll if it's the last message or user is already at bottom
                flatListRef.current?.scrollToEnd({ animated: true });
              }}
            />
          )}

          {manualLoading && (
            <GlassBox style={styles.errorBox} intensity={50}>
              <ActivityIndicator size="small" color={accentColor} />
              <Text style={styles.errorText}>PROCESSING...</Text>
            </GlassBox>
          )}

          {/* Neural Link Input Area */}
          <View style={styles.inputWrapper}>
              <View style={styles.floatingInputBar}>
                {Platform.OS === 'ios' ? (
                  <BlurView intensity={80} tint="dark" style={styles.inputPill}>
                    {renderInputContent()}
                  </BlurView>
                ) : (
                  <View style={[styles.inputPill, { backgroundColor: 'rgba(15, 23, 42, 0.95)' }]}>
                    {renderInputContent()}
                  </View>
                )}
              </View>
              {isLoading && (
                 <View style={styles.statusHub}>
                    <View style={styles.typingIndicator}>
                       <ActivityIndicator size="small" color={accentColor} />
                       <Text style={[styles.typingText, { color: accentColor }]}>{providerLabel} IS ACTIVE</Text>
                    </View>
                    
                    <View style={styles.statusContent}>
                          <Animated.Text 
                            key={activeStatus}
                            entering={FadeInDown} 
                            style={styles.currentToolText}
                          >
                            {activeStatus.toUpperCase()}
                          </Animated.Text>
                          <Animated.Text 
                            key={activeMotivation}
                            entering={FadeIn.delay(100)} 
                            style={styles.motivationText}
                          >
                            {activeMotivation}
                          </Animated.Text>
                    </View>
                 </View>
              )}
          </View>
        </KeyboardAvoidingView>

        {/* Branch Selection Modal */}
        <Modal visible={showBranchModal} animationType="slide" transparent={true}>
          <View style={branchModalStyles.overlay}>
            <View style={branchModalStyles.sheet}>
              <View style={branchModalStyles.header}>
                <View>
                  <Text style={branchModalStyles.title}>NEURAL BRANCH</Text>
                  <Text style={branchModalStyles.subtitle}>{currentRepo?.name}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowBranchModal(false)} style={branchModalStyles.closeBtn}>
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={branches}
                keyExtractor={(item) => item.name}
                renderItem={({ item }) => {
                  const isActive = currentBranch === item.name;
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        setCurrentBranch(item.name);
                        setShowBranchModal(false);
                        handleNewChat();
                      }}
                      style={[branchModalStyles.branchItem, isActive && branchModalStyles.branchItemActive]}
                    >
                      <Ionicons
                        name="git-branch"
                        size={18}
                        color={isActive ? '#D946EF' : '#64748b'}
                        style={{ marginRight: 14 }}
                      />
                      <Text style={[branchModalStyles.branchText, isActive && branchModalStyles.branchTextActive]}>
                        {item.name}
                      </Text>
                      {isActive && (
                        <View style={branchModalStyles.activePill}>
                          <Text style={branchModalStyles.activePillText}>ACTIVE</Text>
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
            </View>
          </View>
        </Modal>

        {/* Model Switcher Modal */}
        <ModelSwitcherModal
          visible={showModelSwitcher}
          onClose={() => setShowModelSwitcher(false)}
          selectedModel={selectedModel}
          onSelectModel={handleModelSwitch}
          geminiApiKey={geminiApiKey}
          onRequestGeminiKey={() => setShowGeminiKeyModal(true)}
        />

        {/* Gemini API Key Modal */}
        <GeminiKeyModal
          visible={showGeminiKeyModal}
          onClose={() => setShowGeminiKeyModal(false)}
          onSave={handleSaveGeminiKey}
        />

      </SafeAreaView>
    </View>
  );

  function renderInputContent() {
    return (
      <>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowModelSwitcher(true);
          }}
          style={styles.toolBtn}
        >
          <Image source={selectedModel.logo} style={{ width: selectedModel.logoRound ? 24 : 20, height: selectedModel.logoRound ? 24 : 20, borderRadius: selectedModel.logoRound ? 12 : 0 }} resizeMode="contain" />
        </TouchableOpacity>
        
        <TextInput
          style={styles.input}
          placeholder={`Message ${selectedModel.name}...`}
          placeholderTextColor="#475569"
          value={messageInput}
          onChangeText={setMessageInput}
          multiline
          maxLength={2000}
        />
        
        <TouchableOpacity 
           onPress={onSend}
           disabled={isLoading || (messageInput || '').trim().length === 0}
           style={[
             styles.sendBtn, 
             { backgroundColor: (isLoading || (messageInput || '').trim().length === 0) ? `${accentColor}18` : accentColor }
           ]}
        >
          <Ionicons 
            name="arrow-up" 
            size={20} 
            color={(isLoading || (messageInput || '').trim().length === 0) ? '#475569' : '#000'} 
          />
        </TouchableOpacity>
      </>
    );
  }
}

const styles = StyleSheet.create({
  header: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 12,
    borderColor: 'rgba(34, 211, 238, 0.15)',
  },
  blur: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22D3EE',
    marginRight: 6,
    shadowColor: '#22D3EE',
    shadowRadius: 3,
    shadowOpacity: 0.8,
  },
  missionText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif',
    letterSpacing: 0,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif',
    letterSpacing: 0,
    marginTop: 2,
  },
  modelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
  modelBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(34, 211, 238, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.2)',
  },
  glass: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  messageWrapper: {
      marginBottom: 20,
      width: '100%',
  },
  bubbleContainer: {
    padding: 14,
    borderRadius: 12,
    maxWidth: '88%',
    position: 'relative',
    overflow: 'hidden',
  },
  aiAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#22D3EE',
  },
  userBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomRightRadius: 2,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  aiBubble: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.15)',
  },
  timestamp: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif',
    textTransform: 'uppercase',
  },
  toolCall: {
    width: '88%',
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderColor: 'rgba(34, 211, 238, 0.3)',
  },
  toolName: {
    color: '#22D3EE',
    fontSize: 14,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'GeistMono' : 'monospace',
    marginLeft: 6,
    letterSpacing: 1.4,
  },
  diffButton: {
    backgroundColor: '#22D3EE',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  diffButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'GeistMono' : 'monospace',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  errorBox: {
    margin: 16,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  errorText: {
    color: '#f43f5e',
    fontSize: 12,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif',
    textAlign: 'center',
    padding: 12,
  },
  inputWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 90,
  },
  floatingInputBar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 6,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    minHeight: 52,
  },
  toolBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif',
    paddingHorizontal: 8,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typingText: {
    color: '#22D3EE',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'GeistMono' : 'monospace',
    marginLeft: 8,
    letterSpacing: 2,
  },
  statusHub: {
    marginTop: 12,
    alignItems: 'center',
    paddingBottom: 4,
  },
  statusContent: {
    alignItems: 'center',
  },
  currentToolText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'GeistMono' : 'monospace',
    letterSpacing: 1,
    marginBottom: 2,
  },
  motivationText: {
    color: '#64748b',
    fontSize: 11,
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif',
  },
  copiedBadge: {
    position: 'absolute',
    top: -24,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  copiedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif',
  }
});

const branchModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '55%',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif',
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
  branchText: {
    color: '#94a3b8',
    fontSize: 15,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif',
  },
  branchTextActive: {
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
