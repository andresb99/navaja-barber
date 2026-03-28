import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavajaTheme } from '../../lib/theme';
import {
  getGlassTint,
  getSheenGradient,
  getSurfaceGradient,
} from './gradients';

export function StatTile({
  label,
  value,
  style,
}: {
  label: string;
  value: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useNavajaTheme();

  return (
    <View
      style={[
        styles.statTile,
        {
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={getSurfaceGradient(colors)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={getGlassTint(colors)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={getSheenGradient(colors)}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 0.84, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0)', colors.borderActive, `${colors.accent}33`, 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.statBeam}
      />
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statTile: { position: 'relative', overflow: 'hidden', flex: 1, borderRadius: 20, borderWidth: 1, padding: 12, gap: 6 },
  statBeam: { position: 'absolute', left: 10, right: 10, top: 9, height: 1 },
  statLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 0.8, textTransform: 'uppercase' },
  statValue: { fontSize: 22, fontFamily: 'Sora_800ExtraBold' },
});
