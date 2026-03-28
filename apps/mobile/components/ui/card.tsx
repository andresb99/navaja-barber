import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavajaTheme } from '../../lib/theme';
import {
  getCoolFade,
  getSheenGradient,
  getSurfaceGradient,
  getWarmFade,
} from './gradients';

export function Card({
  children,
  style,
  elevated = false,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; elevated?: boolean }>) {
  const { colors } = useNavajaTheme();

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: colors.border,
          shadowColor: colors.shadow,
          backgroundColor: elevated ? colors.panelRaised : colors.panel,
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
        colors={getCoolFade(colors)}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.28, y: 0.76 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={getWarmFade(colors)}
        start={{ x: 0.04, y: 1 }}
        end={{ x: 0.82, y: 0.34 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={getSheenGradient(colors)}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 0.82, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={
          colors.mode === 'dark'
            ? ['rgba(255,255,255,0)', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0)']
            : ['rgba(56,189,248,0)', 'rgba(56,189,248,0.42)', 'rgba(244,63,94,0.28)', 'rgba(244,63,94,0)']
        }
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.cardBeam}
      />
      <View style={styles.cardContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'relative', overflow: 'hidden', borderRadius: 24, borderWidth: 1, padding: 20, shadowOpacity: 0.1, shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, elevation: 3 },
  cardBeam: { position: 'absolute', left: 16, right: 16, top: 0, height: 1 },
  cardContent: { gap: 14 },
});
