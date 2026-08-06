import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOut, Layout } from 'react-native-reanimated';
import { Colors, Font, Radius, Spacing } from '../constants/theme';

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
        return <Ionicons name="checkmark-circle" size={24} color={Colors.success} />;
      case 'in-progress':
        return <Ionicons name="sync" size={24} color={Colors.accent} />;
      default:
        return <Ionicons name="ellipse-outline" size={24} color={Colors.textMuted} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In progress';
      default: return 'Pending';
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
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={[styles.iconBox, { backgroundColor: `${providerColor}22`, borderColor: `${providerColor}44` }]}>
                  <Ionicons name="list" size={20} color={providerColor} />
                </View>
                <View>
                  <Text style={styles.title}>Task list</Text>
                  <Text style={styles.subtitle}>{todos.length} steps to completion</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {todos.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle-outline" size={48} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>No tasks created yet.</Text>
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
                        { color: todo.status === 'completed' ? Colors.success : todo.status === 'in-progress' ? Colors.accent : Colors.textMuted }
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
                {Math.round((todos.filter(t => t.status === 'completed').length / (todos.length || 1)) * 100)}% complete
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  dismissArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  content: {
    padding: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Font.sizeLG,
    fontWeight: '600',
    fontFamily: Font.sans,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Font.sizeSM,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    marginBottom: Spacing.xl,
  },
  todoItem: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    gap: 14,
  },
  completedItem: {
    opacity: 0.6,
    backgroundColor: 'rgba(63, 185, 80, 0.03)',
  },
  todoIcon: {
    justifyContent: 'center',
  },
  todoContent: {
    flex: 1,
  },
  todoTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
    fontFamily: Font.sans,
    lineHeight: 20,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  todoStatus: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Font.sans,
    marginTop: 4,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: Font.sizeMD,
    textAlign: 'center',
    fontFamily: Font.sans,
  },
  footer: {
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    color: Colors.textSecondary,
    fontSize: Font.sizeXS,
    fontWeight: '600',
    fontFamily: Font.sans,
  }
});
