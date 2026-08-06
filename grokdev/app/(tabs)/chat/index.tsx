import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, InteractionManager, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { API_BASE_URL } from '../../../constants/Config';
import { Colors, Font, Radius, Spacing, Shadows } from '../../../constants/theme';

const { width } = Dimensions.get('window');

const ConversationCard = React.memo(({ item, index, formatDate, isNavigating, onPress }: any) => {
    const firstUserMsg = item.messages?.find((m: any) => m.role === 'user')?.content || 'New conversation';

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={[styles.card, Shadows.card, isNavigating && { opacity: 0.6 }]}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.convTitle} numberOfLines={1}>
                    {firstUserMsg}
                </Text>
                <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
            </View>

            <View style={styles.cardFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
                    {isNavigating ? (
                        <ActivityIndicator size="small" color={Colors.accent} />
                    ) : (
                        <Ionicons name="chatbubble-ellipses-outline" size={14} color={Colors.textMuted} />
                    )}
                    <Text style={styles.messagePreview} numberOfLines={1}>
                        {(() => {
                            const lastMsg = item.messages && item.messages.length > 0 ? item.messages[0] : null;
                            if (!lastMsg) return 'Start the conversation...';
                            if (lastMsg.role === 'tool') return 'Executing a tool...';
                            if (lastMsg.role === 'assistant' && !lastMsg.content) return 'Thinking...';
                            return lastMsg.content || '...';
                        })()}
                    </Text>
                </View>
                {item.repo && (
                    <View style={styles.repoTag}>
                        <Text style={styles.repoTagText}>{item.repo.name}</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}, (prevProps: any, nextProps: any) => {
    return prevProps.item.id === nextProps.item.id && prevProps.index === nextProps.index;
});

export default function ConversationListScreen() {
    const { token } = useAuthStore();
    const router = useRouter();
    const [conversations, setConversations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [navigatingId, setNavigatingId] = useState<string | null>(null);

    const fetchConversations = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/chat/conversations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
            }
        } catch (e) {
            console.error('Failed to fetch conversations', e);
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (token) {
                const task = InteractionManager.runAfterInteractions(() => {
                    fetchConversations();
                });
                return () => task.cancel();
            }
        }, [token])
    );

    const renderDate = useCallback((dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }, []);

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Chats</Text>
                        <Text style={styles.headerSubtitle}>Your conversations with GrokDev</Text>
                    </View>
                </View>

                {isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Colors.accent} />
                    </View>
                ) : (
                    <FlatList
                        data={conversations}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyState}>
                                <Ionicons name="chatbubbles-outline" size={44} color={Colors.textMuted} />
                                <Text style={styles.emptyTitle}>No conversations yet</Text>
                                <Text style={styles.emptySubtitle}>
                                    Start a new chat to have GrokDev help with your code.
                                </Text>
                            </View>
                        )}
                        renderItem={({ item, index }) => (
                            <ConversationCard
                                item={item}
                                index={index}
                                formatDate={renderDate}
                                isNavigating={navigatingId === item.id}
                                onPress={() => {
                                    if (navigatingId) return;
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setNavigatingId(item.id);
                                    setTimeout(() => {
                                        router.push(`/chat/${item.id}`);
                                        setTimeout(() => setNavigatingId(null), 500);
                                    }, 10);
                                }}
                            />
                        )}
                    />
                )}

                {/* Floating Action Button */}
                <Animated.View entering={FadeInUp.springify().delay(300)}>
                    <TouchableOpacity
                        style={styles.fab}
                        activeOpacity={0.8}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            router.push('/chat/new');
                        }}
                    >
                        <Ionicons name="add" size={28} color="#fff" />
                    </TouchableOpacity>
                </Animated.View>
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
    listContent: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.sm,
        paddingBottom: 160,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: Spacing.lg,
    },
    convTitle: {
        flex: 1,
        color: Colors.textPrimary,
        fontSize: Font.sizeMD,
        fontWeight: '600',
        fontFamily: Font.sans,
        lineHeight: 20,
    },
    dateText: {
        color: Colors.textMuted,
        fontSize: Font.sizeXS,
        fontFamily: Font.sans,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.sm,
    },
    messagePreview: {
        color: Colors.textSecondary,
        fontSize: Font.sizeSM,
        fontFamily: Font.sans,
        maxWidth: width * 0.6,
    },
    repoTag: {
        backgroundColor: Colors.surfaceMuted,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    repoTagText: {
        fontSize: Font.sizeXS,
        color: Colors.textSecondary,
        fontFamily: Font.sans,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        color: Colors.textPrimary,
        fontSize: Font.sizeLG,
        fontWeight: '600',
        fontFamily: Font.sans,
        marginTop: Spacing.lg,
    },
    emptySubtitle: {
        color: Colors.textMuted,
        fontSize: Font.sizeMD,
        marginTop: Spacing.sm,
        textAlign: 'center',
        lineHeight: 22,
    },
    fab: {
        position: 'absolute',
        bottom: 110,
        right: Spacing.xxl,
        backgroundColor: Colors.accent,
        width: 56,
        height: 56,
        borderRadius: Radius.xl,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
});
