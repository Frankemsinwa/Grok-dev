import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  withTiming,
  Easing,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { Colors, Font, Radius, Spacing } from '../constants/theme';

const GROK_LOGO = require('../assets/Grok-trans.png');

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    title: 'Code anywhere',
    subtitle: 'A professional IDE in your pocket',
    description: 'Connect, browse, and edit your GitHub repositories with zero friction.',
  },
  {
    title: 'Beyond chat',
    subtitle: 'Co-piloted by Grok-3',
    description: 'GrokDev is an agent that can read your entire repo, write features, and hunt down bugs.',
  },
  {
    title: 'Ship smarter',
    subtitle: 'Commit with confidence',
    description: 'Review changes in a clean diff viewer and push directly to GitHub. Ship code on the go.',
  }
];

const Slide = ({ slide, index, scrollX }: { slide: typeof SLIDES[0], index: number, scrollX: SharedValue<number> }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolate.CLAMP
    );

    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [40, 0, -40],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }]
    };
  });

  return (
    <View style={styles.slideContainer}>
      <Animated.View style={[styles.content, animatedStyle]}>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </Animated.View>
    </View>
  );
};

export default function Onboarding({ visible, onFinish }: { visible: boolean, onFinish: () => void }) {
  const scrollX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scrollViewRef = useRef<Animated.ScrollView>(null);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleFinish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    opacity.value = withTiming(0, { duration: 400, easing: Easing.in(Easing.quad) }, () => {
      runOnJS(onFinish)();
    });
  };

  const nextSlide = () => {
    const nextIndex = Math.floor(scrollX.value / width) + 1;
    if (nextIndex < SLIDES.length) {
      scrollViewRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      handleFinish();
    }
  };

  if (!visible) return null;

  const activeIndexStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value
    };
  });

  return (
    <Animated.View style={[styles.container, activeIndexStyle]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Image source={GROK_LOGO} style={styles.headerLogo} resizeMode="contain" />
          <TouchableOpacity onPress={handleFinish}>
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        </View>

        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          style={styles.scrollView}
        >
          {SLIDES.map((slide, index) => (
            <Slide key={index} slide={slide} index={index} scrollX={scrollX} />
          ))}
        </Animated.ScrollView>

        <View style={styles.footer}>
          <View style={styles.pagination}>
            {SLIDES.map((_, i) => {
              const dotStyle = useAnimatedStyle(() => {
                const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                const dotWidth = interpolate(
                  scrollX.value,
                  inputRange,
                  [8, 32, 8],
                  Extrapolate.CLAMP
                );
                const dotOpacity = interpolate(
                  scrollX.value,
                  inputRange,
                  [0.3, 1, 0.3],
                  Extrapolate.CLAMP
                );
                return {
                  width: dotWidth,
                  opacity: dotOpacity,
                  backgroundColor: Colors.accent
                };
              });
              return <Animated.View key={i} style={[styles.dot, dotStyle]} />;
            })}
          </View>

          <TouchableOpacity style={styles.button} onPress={nextSlide}>
            <View style={styles.buttonInner}>
              <Text style={styles.buttonText}>
                {Math.floor(scrollX.value / width) + 1 >= SLIDES.length ? 'Get started' : 'Continue'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: Spacing.md }} />
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    zIndex: 1000,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: Spacing.xxl,
    paddingTop: 40,
    paddingLeft: Spacing.xl,
    alignItems: 'center',
    zIndex: 10,
  },
  headerLogo: {
    width: 120,
    height: 42,
  },
  skip: {
    color: Colors.textSecondary,
    fontSize: Font.sizeMD,
    fontWeight: '500',
    fontFamily: Font.sans,
  },
  scrollView: {
    flex: 1,
  },
  slideContainer: {
    width: width,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  content: {
    alignItems: 'flex-start',
  },
  subtitle: {
    color: Colors.accent,
    fontSize: Font.sizeMD,
    fontWeight: '600',
    fontFamily: Font.sans,
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 44,
    fontWeight: '700',
    fontFamily: Font.sans,
    marginBottom: Spacing.xl,
    letterSpacing: -1,
    lineHeight: 52,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: Font.sizeLG,
    lineHeight: 28,
    fontFamily: Font.sans,
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Platform.OS === 'ios' ? 20 : 40,
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: Spacing.xxl,
    height: 8,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  button: {
    width: '100%',
    height: 56,
  },
  buttonInner: {
    flex: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: Font.sizeMD,
    fontWeight: '600',
    fontFamily: Font.sans,
  },
});
