import { StyleSheet, View } from 'react-native';
import { Skeleton as HeroSkeleton } from 'heroui-native';

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <View style={styles.card}>
      {Array.from({ length: lines }).map((_, i) => (
        <HeroSkeleton
          key={i}
          variant="shimmer"
          className={i === 0 ? 'h-4 w-3/4 rounded-lg' : i === lines - 1 ? 'h-3 w-1/2 rounded-lg' : 'h-3 w-full rounded-lg'}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, padding: 16, borderRadius: 20, overflow: 'hidden' },
});
