import { Tabs } from 'expo-router';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors, Font, Radius, Spacing } from '../../constants/theme';

const TABS: { name: string; title: string; icon: string; iconOutline: string }[] = [
  { name: 'home', title: 'Home', icon: 'terminal', iconOutline: 'terminal-outline' },
  { name: 'github', title: 'Repos', icon: 'logo-github', iconOutline: 'logo-github' },
  { name: 'explorer', title: 'Files', icon: 'folder', iconOutline: 'folder-outline' },
  { name: 'chat', title: 'Grok', icon: 'sparkles', iconOutline: 'sparkles-outline' },
  { name: 'settings', title: 'Settings', icon: 'options', iconOutline: 'options-outline' },
];

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom + Spacing.sm }]}>
      <View style={styles.bar}>
        {state.routes.map((route: any, index: number) => {
          const tab = TABS.find((t) => t.name === route.name) || TABS[0];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.6}
            >
              <Ionicons
                name={(isFocused ? tab.icon : tab.iconOutline) as any}
                size={22}
                color={isFocused ? Colors.accent : Colors.textMuted}
              />
              <Text style={[styles.label, isFocused && styles.labelActive]}>{tab.title}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="github" options={{ title: 'Repos' }} />
      <Tabs.Screen name="explorer" options={{ title: 'Files' }} />
      <Tabs.Screen name="chat" options={{ title: 'Grok' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    height: 62,
    zIndex: 100,
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    paddingHorizontal: Spacing.sm,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  label: {
    color: Colors.textMuted,
    fontSize: Font.sizeXS,
    fontFamily: Font.sans,
  },
  labelActive: {
    color: Colors.accent,
    fontWeight: '600',
  },
});
