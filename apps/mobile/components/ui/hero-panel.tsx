import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavajaTheme } from '../../lib/theme';
import {
  getCoolFade,
  getHeroGradient,
  getSheenGradient,
  getWarmFade,
} from './gradients';

export function HeroPanel({
  eyebrow,
  title,
  description,
  children,
  style,
}: PropsWithChildren<{
  eyebrow?: string;
  title: string;
  description?: string;
  style?: StyleProp<ViewStyle>;
}>) {
  const { colors } = useNavajaTheme();

  return (
    <View
      style={[
        styles.heroPanel,
        {
          borderColor: colors.heroBorder,
          shadowColor: colors.shadow,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={getHeroGradient(colors)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={getCoolFade(colors)}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.22, y: 0.76 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={getWarmFade(colors)}
        start={{ x: 0.04, y: 1 }}
        end={{ x: 0.88, y: 0.24 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={getSheenGradient(colors, 'strong')}
        start={{ x: 0.06, y: 0 }}
        end={{ x: 0.86, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.heroContent}>
        {eyebrow ? (
          <Text
            style={[
              styles.heroEyebrow,
              {
                backgroundColor: colors.pillMuted,
                borderColor: colors.border,
                color: colors.textMuted,
              },
            ]}
          >
            {eyebrow}
          </Text>
        ) : null}
        <Text style={[styles.heroTitle, { color: colors.text }]}>{title}</Text>
        {description ? (
          <Text style={[styles.heroDescription, { color: colors.textMuted }]}>
            {description}
          </Text>
        ) : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroPanel: { position: 'relative', overflow: 'hidden', borderRadius: 30, borderWidth: 1, padding: 20, shadowOpacity: 0.12, shadowOffset: { width: 0, height: 10 }, shadowRadius: 22, elevation: 4 },
  heroContent: { gap: 10 },
  heroEyebrow: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 6, fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1.1, textTransform: 'uppercase', overflow: 'hidden' },
  heroTitle: { fontSize: 25, fontFamily: 'Sora_800ExtraBold', letterSpacing: -0.45 },
  heroDescription: { fontSize: 14, lineHeight: 20, fontFamily: 'PlusJakartaSans_400Regular' },
});
