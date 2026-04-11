import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { StyleSheet, Platform, View, TouchableOpacity, Text, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const TAB_BAR_WIDTH = width - 40;
const TAB_WIDTH = TAB_BAR_WIDTH / 5;

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const translateX = useSharedValue(state.index * TAB_WIDTH);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(translateX.value, { damping: 15, stiffness: 120 }) }],
  }));

  return (
    <View style={[styles.tabBarWrapper, { bottom: insets.bottom + 10 }]}>
      <BlurView intensity={40} tint="dark" style={styles.tabBarContainer}>
        <Animated.View style={[styles.indicatorPill, indicatorStyle]} />
        
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              translateX.value = index * TAB_WIDTH;
              navigation.navigate(route.name);
            }
          };

          const iconName = () => {
            switch (route.name) {
              case 'home': return isFocused ? "terminal" : "terminal-outline";
              case 'chat': return isFocused ? "sparkles" : "sparkles-outline";
              case 'explorer': return isFocused ? "folder-open" : "folder-outline";
              case 'github': return "logo-github";
              case 'settings': return isFocused ? "options" : "options-outline";
              default: return "square";
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <Animated.View style={isFocused ? styles.activeIconWrapper : null}>
                <Ionicons 
                  name={iconName() as any} 
                  size={24} 
                  color={isFocused ? '#fff' : '#64748b'} 
                />
              </Animated.View>
              {isFocused && (
                  <Animated.Text style={styles.activeLabel}>
                      {options.title || route.name}
                  </Animated.Text>
              )}
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: 'COMMAND' }} />
      <Tabs.Screen name="chat" options={{ title: 'GROK' }} />
      <Tabs.Screen name="explorer" options={{ title: 'FILES' }} />
      <Tabs.Screen name="github" options={{ title: 'SOURCE' }} />
      <Tabs.Screen name="settings" options={{ title: 'CONFIG' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 70,
    zIndex: 100,
  },
  tabBarContainer: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 35,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    paddingHorizontal: 5,
  },
  indicatorPill: {
    position: 'absolute',
    width: TAB_WIDTH - 10,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 30,
    top: 5,
    left: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIconWrapper: {
      shadowColor: '#FFFFFF',
      shadowRadius: 10,
      shadowOpacity: 0.8,
      elevation: 5,
  },
  activeLabel: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  }
});
