import { PropsWithChildren } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavajaTheme } from '../../lib/theme';
import {
  getActiveGradient,
  getCoolFade,
  getGlassTint,
  getSheenGradient,
  getSurfaceGradient,
  getWarmFade,
} from './gradients';

export function SurfaceCard({
  children,
  style,
  contentStyle,
  active = false,
  onPress,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  active?: boolean;
  onPress?: () => void;
}>) {
  const { colors } = useNavajaTheme();
  const overlayColors = active ? getActiveGradient(colors) : getGlassTint(colors);
  const borderColor = active ? colors.borderActive : colors.border;
  const beamAccent = active ? colors.borderActive : 'rgba(139,92,246,0.16)';

  const inner = (
    <>
      <LinearGradient
        colors={getSurfaceGradient(colors)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={overlayColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={getCoolFade(colors)}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.24, y: 0.72 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={getWarmFade(colors)}
        start={{ x: 0.06, y: 1 }}
        end={{ x: 0.82, y: 0.3 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={getSheenGradient(colors, active ? 'strong' : 'soft')}
        start={{ x: 0.06, y: 0 }}
        end={{ x: 0.84, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0)', beamAccent, `${colors.accent}33`, 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.surfaceBeam}
      />
      <View style={[styles.surfaceContent, contentStyle]}>{children}</View>
    </>
  );

  const card = (
    <View
      style={[
        styles.surfaceCard,
        {
          borderColor,
          shadowColor: colors.shadow,
        },
        style,
      ]}
    >
      {inner}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button">
        {card}
      </Pressable>
    );
  }

  return card;
}

const styles = StyleSheet.create({
  surfaceCard: { position: 'relative', overflow: 'hidden', borderRadius: 16, borderWidth: 1, padding: 16, shadowOpacity: 0.08, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 2 },
  surfaceBeam: { position: 'absolute', left: 16, right: 16, top: 0, height: 1 },
  surfaceContent: { gap: 8 },
});
