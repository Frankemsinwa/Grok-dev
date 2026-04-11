import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  Easing,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const STAR_COUNT = 60;
const SHOOTING_STAR_COUNT = 4;

interface StarProps {
  index: number;
  scrollX: Animated.SharedValue<number>;
  speed: Animated.SharedValue<number>;
}

const Star = ({ index, scrollX, speed }: StarProps) => {
  const opacity = useSharedValue(Math.random());
  const randomFactor = useMemo(() => Math.random() * 0.5 + 0.5, []);
  
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(Math.random() < 0.5 ? 0.2 : 0.8, { duration: 2000 + Math.random() * 3000 }),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const parallax = interpolate(
      scrollX.value,
      [0, width * 3],
      [0, -width * 0.5 * randomFactor],
      Extrapolate.CLAMP
    );

    return {
      opacity: opacity.value,
      transform: [
        { translateX: parallax },
        { scale: interpolate(speed.value, [1, 5], [1, 2], Extrapolate.CLAMP) }
      ]
    };
  });

  const size = Math.random() * 2 + 1;
  const top = Math.random() * height;
  const left = Math.random() * (width * 1.5);

  return (
    <Animated.View 
      style={[
        styles.star, 
        style, 
        { 
          width: size, 
          height: size, 
          top, 
          left, 
          borderRadius: size / 2 
        }
      ]} 
    />
  );
};

const ShootingStar = () => {
  const progress = useSharedValue(0);
  const config = useMemo(() => ({
    startX: Math.random() * width,
    startY: Math.random() * (height / 2),
    angle: 45,
    distance: width * 1.5,
  }), []);

  useEffect(() => {
    const runAnimation = () => {
      progress.value = 0;
      progress.value = withTiming(1, { 
        duration: 1500 + Math.random() * 1000,
        easing: Easing.out(Easing.quad)
      }, () => {
        // Run again after a random delay
      });
    };

    const interval = setInterval(runAnimation, 10000 + Math.random() * 15000);
    runAnimation();
    return () => clearInterval(interval);
  }, []);

  const style = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 0.1, 0.8, 1], [0, 1, 1, 0]);
    const translateX = interpolate(progress.value, [0, 1], [config.startX, config.startX + config.distance]);
    const translateY = interpolate(progress.value, [0, 1], [config.startY, config.startY + config.distance]);

    return {
      opacity,
      transform: [
        { translateX },
        { translateY },
        { rotate: `${config.angle}deg` }
      ],
    };
  });

  return (
    <Animated.View style={[styles.shootingStar, style]}>
       <View style={styles.shootingStarHead} />
       <View style={styles.shootingStarTail} />
    </Animated.View>
  );
};

export const Starfield = React.memo(function Starfield({ scrollX, speed }: { scrollX?: Animated.SharedValue<number>, speed?: Animated.SharedValue<number> }) {
  const defaultScrollX = useSharedValue(0);
  const defaultSpeed = useSharedValue(1);
  
  const activeScrollX = scrollX || defaultScrollX;
  const activeSpeed = speed || defaultSpeed;

  // We use a fixed seed for random values so they are stable between re-renders
  const starData = useMemo(() => 
    Array.from({ length: STAR_COUNT }).map(() => ({
      size: Math.random() * 2 + 1,
      top: Math.random() * height,
      left: Math.random() * (width * 1.5),
      randomFactor: Math.random() * 0.5 + 0.5,
    })), []);

  const stars = useMemo(() => 
    starData.map((data, i) => (
      <StarItem key={i} data={data} scrollX={activeScrollX} speed={activeSpeed} />
    )), [activeScrollX, activeSpeed, starData]);

  const shootingStars = useMemo(() => 
    Array.from({ length: SHOOTING_STAR_COUNT }).map((_, i) => (
      <ShootingStar key={i} />
    )), []);

  return (
    <View pointerEvents="none" style={styles.container}>
      {stars}
      {shootingStars}
    </View>
  );
});

// Extract Star into a memoized sub-component
const StarItem = React.memo(({ data, scrollX, speed }: { data: any, scrollX: Animated.SharedValue<number>, speed: Animated.SharedValue<number> }) => {
  const opacity = useSharedValue(0.5);
  
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(Math.random() < 0.5 ? 0.2 : 0.8, { duration: 3000 + Math.random() * 4000 }),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const parallax = interpolate(
      scrollX.value,
      [0, width * 3],
      [0, -width * 0.5 * data.randomFactor],
      Extrapolate.CLAMP
    );

    return {
      opacity: opacity.value,
      transform: [
        { translateX: parallax },
        { scale: interpolate(speed.value, [1, 5], [1, 1.5], Extrapolate.CLAMP) }
      ]
    };
  });

  return (
    <Animated.View 
      style={[
        styles.star, 
        style, 
        { 
          width: data.size, 
          height: data.size, 
          top: data.top, 
          left: data.left, 
          borderRadius: data.size / 2 
        }
      ]} 
    />
  );
});

export default Starfield;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#fff',
  },
  shootingStar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  shootingStarHead: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
    shadowColor: '#FFFFFF',
    shadowRadius: 6,
    shadowOpacity: 1,
    elevation: 10,
  },
  shootingStarTail: {
    width: 100,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginLeft: -2,
  }
});
