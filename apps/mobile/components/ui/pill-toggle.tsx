import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavajaTheme } from '../../lib/theme';
import { getActiveGradient, getSecondaryGradient } from './gradients';

export function PillToggle({
  label,
  active,
  onPress,
  compact = false,
}: {
  label: string;
  active: boolean;
  onPress?: () => void;
  compact?: boolean;
}) {
  const { colors } = useNavajaTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pillToggle,
        compact ? styles.pillToggleCompact : null,
        {
          borderColor: active ? colors.borderActive : colors.borderMuted,
          backgroundColor: 'transparent',
        },
      ]}
    >
      <LinearGradient
        colors={active ? getActiveGradient(colors) : getSecondaryGradient(colors)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Text
        style={[
          styles.pillToggleText,
          compact ? styles.pillToggleTextCompact : null,
          { color: active ? colors.pillTextActive : colors.pillText },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pillToggle: { position: 'relative', overflow: 'hidden', borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  pillToggleCompact: { paddingHorizontal: 10, paddingVertical: 6 },
  pillToggleText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
  pillToggleTextCompact: { fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 0.7, textTransform: 'uppercase' },
});
