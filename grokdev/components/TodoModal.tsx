import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOut, Layout } from 'react-native-reanimated';

export interface Todo {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed';
}

interface TodoModalProps {
  visible: boolean;
  onClose: () => void;
  todos: Todo[];
  providerColor: string;
}

export const TodoModal: React.FC<TodoModalProps> = ({ visible, onClose, todos, providerColor }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Ionicons name="checkmark-circle" size={24} color="#4ade80" />;
      case 'in-progress':
        return <Ionicons name="sync" size={24} color="#60a5fa" />;
      default:
        return <Ionicons name="ellipse-outline" size={24} color="#94a3b8" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'COMPLETED';
      case 'in-progress': return 'IN PROGRESS';
      default: return 'PENDING';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
        <Animated.View 
          entering={FadeInDown.springify()} 
          exiting={FadeOut}
          style={styles.container}
        >
          {Platform.OS === 'ios' ? (
            <BlurView intensity={80} tint="dark" style={styles.blur}>
              <Content />
            </BlurView>
          ) : (
            <View style={[styles.blur, { backgroundColor: '#0f172a' }]}>
              <Content />
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );

  function Content() {
    return (
      <>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconBox, { backgroundColor: `${providerColor}22`, borderColor: `${providerColor}44` }]}>
              <Ionicons name="list" size={20} color={providerColor} />
            </View>
            <View>
              <Text style={styles.title}>MISSION OBJECTIVES</Text>
              <Text style={styles.subtitle}>{todos.length} steps to completion</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {todos.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="Construct-outline" size={48} color="#1e293b" />
              <Text style={styles.emptyText}>No objectives established yet.</Text>
            </View>
          ) : (
            todos.map((todo, index) => (
              <Animated.View 
                key={todo.id} 
                layout={Layout.springify()}
                entering={FadeInDown.delay(index * 50)}
                style={[
                    styles.todoItem,
                    todo.status === 'completed' && styles.completedItem
                ]}
              >
                <View style={styles.todoIcon}>
                  {getStatusIcon(todo.status)}
                </View>
                <View style={styles.todoContent}>
                  <Text style={[
                    styles.todoTitle,
                    todo.status === 'completed' && styles.completedTitle
                  ]}>
                    {todo.title}
                  </Text>
                  <Text style={[
                    styles.todoStatus,
                    { color: todo.status === 'completed' ? '#4ade80' : todo.status === 'in-progress' ? '#60a5fa' : '#64748b' }
                  ]}>
                    {getStatusText(todo.status)}
                  </Text>
                </View>
              </Animated.View>
            ))
          )}
        </ScrollView>
        
        <View style={styles.footer}>
            <View style={styles.progressBarBg}>
                <Animated.View 
                    style={[
                        styles.progressBarFill, 
                        { 
                            backgroundColor: providerColor,
                            width: `${(todos.filter(t => t.status === 'completed').length / (todos.length || 1)) * 100}%` 
                        }
                    ]} 
                />
            </View>
            <Text style={styles.progressText}>
                {Math.round((todos.filter(t => t.status === 'completed').length / (todos.length || 1)) * 100)}% COMPLETE
            </Text>
        </View>
      </>
    );
  }
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  blur: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
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
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    marginBottom: 20,
  },
  todoItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 10,
    gap: 14,
  },
  completedItem: {
    opacity: 0.6,
    backgroundColor: 'rgba(74, 222, 128, 0.03)',
  },
  todoIcon: {
    justifyContent: 'center',
  },
  todoContent: {
    flex: 1,
  },
  todoTitle: {
    color: '#cbd5e1',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  todoStatus: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 1,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: {
    color: '#475569',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.05)',
      alignItems: 'center',
  },
  progressBarBg: {
      width: '100%',
      height: 4,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 2,
      overflow: 'hidden',
      marginBottom: 8,
  },
  progressBarFill: {
      height: '100%',
      borderRadius: 2,
  },
  progressText: {
      color: '#64748b',
      fontSize: 10,
      fontWeight: 'bold',
      letterSpacing: 1,
  }
});
