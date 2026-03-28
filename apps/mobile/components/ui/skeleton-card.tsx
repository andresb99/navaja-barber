import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

function ShimmerBar({ style }: { style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[shimmerStyles.bar, style, { opacity }]} />;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <View style={styles.card}>
      {Array.from({ length: lines }).map((_, i) => (
        <ShimmerBar
          key={i}
          style={
            i === 0
              ? shimmerStyles.large
              : i === lines - 1
                ? shimmerStyles.small
                : shimmerStyles.medium
          }
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, padding: 16, borderRadius: 20, overflow: 'hidden' },
});

const shimmerStyles = StyleSheet.create({
  bar: { height: 12, borderRadius: 8, backgroundColor: 'rgba(150, 150, 150, 0.3)' },
  small: { width: '50%' },
  medium: { width: '100%' },
  large: { width: '75%' },
});
