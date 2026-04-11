import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, SafeAreaView, InteractionManager, Dimensions, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import Starfield from '../../../components/Starfield';
import { API_BASE_URL } from '../../../constants/Config';

const GROK_LOGO = require('../../../assets/Grok-trans.png');

const { width } = Dimensions.get('window');

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

const ConversationCard = React.memo(({ item, index, router, formatDate, isNavigating, onPress }: any) => {
    const firstUserMsg = item.messages?.find((m: any) => m.role === 'user')?.content || 'Untethered Session';
    
    return (
        <Animated.View entering={FadeInDown.delay(index * 30).springify()} layout={Layout.springify()}>
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.7}
                style={[styles.cardContainer, isNavigating && { opacity: 0.6 }]}
            >
                <View style={styles.cardContent}>
                    <View style={styles.cardMain}>
                        <Text style={styles.convTitle} numberOfLines={1}>
                            {firstUserMsg.toUpperCase()}
                        </Text>
                        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                    </View>
                    
                    <View style={styles.cardFooter}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {isNavigating ? (
                                <ActivityIndicator size="small" color="#22D3EE" />
                            ) : (
                                <Ionicons name="terminal-outline" size={14} color="#64748b" />
                            )}
                            <Text style={styles.messagePreview} numberOfLines={1}>
                                {(() => {
                                    const lastMsg = item.messages && item.messages.length > 0 ? item.messages[0] : null;
                                    if (!lastMsg) return 'No communications established...';
                                    if (lastMsg.role === 'tool') return 'Executing system protocols...';
                                    if (lastMsg.role === 'assistant' && !lastMsg.content) return 'Processing neural data...';
                                    return lastMsg.content || '...';
                                })()}
                            </Text>
                        </View>
                        {item.repo && (
                            <View style={styles.repoTag}>
                                <Text style={styles.repoTagText}>{item.repo.name.toUpperCase()}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
            <View style={styles.divider} />
        </Animated.View>
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

    const checkProviderColor = useCallback((modelString: string) => {
        if (modelString?.includes('gemini')) return '#4285F4';
        return '#06b6d4'; // Grok Cyan
    }, []);

    const renderDate = useCallback((dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }, []);

    return (
        <View style={styles.container}>
            <Starfield />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <Image source={GROK_LOGO} style={styles.headerLogo} resizeMode="contain" />
                    <View style={styles.headerRight}>
                        <View style={[styles.livePulse, { backgroundColor: '#4ade80', shadowColor: '#4ade80' }]} />
                        <Text style={styles.statusText}>ENCRYPTED</Text>
                    </View>
                </View>

                {isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#FFFFFF" />
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
                                <Ionicons name="chatbubbles-outline" size={48} color="#475569" />
                                <Text style={styles.emptyTitle}>NO ACTIVE LINKS</Text>
                                <Text style={styles.emptySubtitle}>Initialize a new neural transmission to begin.</Text>
                            </View>
                        )}
                        renderItem={({ item, index }) => (
                            <ConversationCard 
                                item={item} 
                                index={index} 
                                router={router} 
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
                        <Ionicons name="add" size={32} color="#000" />
                    </TouchableOpacity>
                </Animated.View>
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
    glass: {
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    blur: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 10 : 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
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
        color: '#4ade80',
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
    listContent: {
        paddingTop: 10,
        paddingBottom: 160,
    },
    cardContainer: {
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    cardContent: {
        gap: 8,
    },
    cardMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 16,
    },
    convTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.5,
        lineHeight: 20,
    },
    dateText: {
        color: '#475569',
        fontSize: 11,
        fontWeight: '600',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    messagePreview: {
        color: '#64748b',
        fontSize: 13,
        fontWeight: '500',
        maxWidth: width * 0.6,
    },
    repoTag: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    repoTagText: {
        fontSize: 9,
        color: '#94a3b8',
        fontWeight: '900',
        letterSpacing: 1,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginHorizontal: 24,
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
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 2,
        marginTop: 24,
    },
    emptySubtitle: {
        color: '#64748b',
        fontSize: 14,
        marginTop: 12,
        textAlign: 'center',
        lineHeight: 22,
    },
    fab: {
        position: 'absolute',
        bottom: 150,
        right: 24,
        backgroundColor: '#fff',
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
});
