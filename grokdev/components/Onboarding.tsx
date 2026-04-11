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
  runOnJS
} from 'react-native-reanimated';
import Starfield from './Starfield';

const GROK_LOGO = require('../assets/Grok-trans.png');

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    title: 'Code Anywhere',
    subtitle: 'THE OFFICE IS WHERE YOU ARE',
    description: 'A professional-grade IDE in your pocket. Connect, browse, and edit your GitHub repositories with zero friction.',
    color: '#FFFFFF', // White Branding
  },
  {
    title: 'Beyond Chat',
    subtitle: 'CO-PILOTED BY GROK-3',
    description: 'Not just a chatbot. GrokDev is an agent that can read your entire repo, write features, and hunt down bugs.',
    color: '#22D3EE', // Terminal Cyan
  },
  {
    title: 'Ship Smarter',
    subtitle: 'COMMIT WITH CONFIDENCE',
    description: 'Review changes in a world-class diff viewer and push directly to GitHub. Ship code on the go, anytime.',
    color: '#fff', 
  }
];

const Slide = ({ slide, index, scrollX }: { slide: typeof SLIDES[0], index: number, scrollX: Animated.SharedValue<number> }) => {
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
      [100, 0, -100],
      Extrapolate.CLAMP
    );

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.8, 1, 0.8],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }, { scale }]
    };
  });

  const subtitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
        scrollX.value,
        [(index - 0.5) * width, index * width, (index + 0.5) * width],
        [0, 1, 0],
        Extrapolate.CLAMP
      );
    return { opacity };
  });

  return (
    <View style={styles.slideContainer}>
      <Animated.View style={[styles.content, animatedStyle]}>
        <Animated.Text style={[styles.subtitle, { color: slide.color, fontFamily: Platform.OS === 'ios' ? 'GeistMono' : 'monospace' }, subtitleStyle]}>
          {slide.subtitle}
        </Animated.Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </Animated.View>
    </View>
  );
};

export default function Onboarding({ visible, onFinish }: { visible: boolean, onFinish: () => void }) {
  const scrollX = useSharedValue(0);
  const speed = useSharedValue(1);
  const opacity = useSharedValue(1);
  const scrollViewRef = useRef<Animated.ScrollView>(null);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleFinish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    speed.value = withTiming(10, { duration: 1000, easing: Easing.in(Easing.quad) });
    opacity.value = withTiming(0, { duration: 1000 }, () => {
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
      <Starfield scrollX={scrollX} speed={speed} />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Image source={GROK_LOGO} style={styles.headerLogo} resizeMode="contain" />
          <TouchableOpacity onPress={onFinish}>
            <Text style={styles.skip}>SKIP</Text>
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
                  backgroundColor: SLIDES[i].color
                };
              });
              return <Animated.View key={i} style={[styles.dot, dotStyle]} />;
            })}
          </View>

          <TouchableOpacity style={styles.button} onPress={nextSlide}>
            <Animated.View style={[styles.buttonInner, { backgroundColor: '#fff' }]}>
              <Text style={styles.buttonText}>CONTINUE</Text>
              <Ionicons name="arrow-forward" size={24} color="#000" style={{ marginLeft: 12 }} />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 1000,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 0,
    paddingRight: 30,
    paddingTop: 40,
    alignItems: 'center',
    zIndex: 10,
  },
  headerLogo: {
    width: 140,
    height: 48,
  },
  logo: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'GeistMono' : 'monospace',
    letterSpacing: 2,
  },
  skip: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'GeistMono' : 'monospace',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
  },
  slideContainer: {
    width: width,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  content: {
    alignItems: 'flex-start',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 1.4,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif',
    marginBottom: 20,
    letterSpacing: -1,
    lineHeight: 56,
  },
  description: {
    color: '#94a3b8',
    fontSize: 20,
    lineHeight: 32,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'universalSans' : 'sans-serif',
  },
  footer: {
    paddingHorizontal: 30,
    paddingBottom: Platform.OS === 'ios' ? 20 : 40,
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: 40,
    height: 8,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  button: {
    width: '100%',
    height: 72,
  },
  buttonInner: {
    flex: 1,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  buttonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'GeistMono' : 'monospace',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
});
