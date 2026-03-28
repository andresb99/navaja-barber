import { PropsWithChildren, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavajaTheme } from '../../lib/theme';
import { AppMenuButton } from '../navigation/app-menu';
import { ThemeToggle } from './theme-toggle';
import {
  getCoolFade,
  getHeroGradient,
  getSheenGradient,
  getWarmFade,
} from './gradients';

export function Screen({
  eyebrow,
  title,
  subtitle,
  children,
  contentStyle,
  showThemeToggle = true,
  showAppMenu = true,
}: PropsWithChildren<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  contentStyle?: StyleProp<ViewStyle>;
  showThemeToggle?: boolean;
  showAppMenu?: boolean;
}>) {
  const { colors } = useNavajaTheme();
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(lift, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, lift]);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollViewport}
      showsVerticalScrollIndicator={false}
    >
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <LinearGradient
          colors={[colors.background, colors.backgroundBase]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={getCoolFade(colors)}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.18, y: 0.82 }}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={getWarmFade(colors)}
          start={{ x: 0, y: 1 }}
          end={{ x: 0.84, y: 0.18 }}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={getSheenGradient(colors)}
          start={{ x: 0.06, y: 0 }}
          end={{ x: 0.86, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      <Animated.View
        style={[
          styles.screenContent,
          contentStyle,
          {
            opacity: fade,
            transform: [{ translateY: lift }],
          },
        ]}
      >
        <View
          style={[
            styles.screenHeaderShell,
            {
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
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
            end={{ x: 0.24, y: 0.72 }}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={getWarmFade(colors)}
            start={{ x: 0.08, y: 1 }}
            end={{ x: 0.82, y: 0.28 }}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={getSheenGradient(colors, 'strong')}
            start={{ x: 0.08, y: 0 }}
            end={{ x: 0.86, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.screenHeaderContent}>
            <View style={styles.screenHeaderRow}>
              <View style={styles.screenTitleBlock}>
                {eyebrow ? (
                  <Text
                    style={[
                      styles.screenEyebrow,
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
                <Text style={[styles.screenTitle, { color: colors.text }]}>{title}</Text>
              </View>
              {showThemeToggle || showAppMenu ? (
                <View style={styles.screenHeaderActions}>
                  {showThemeToggle ? <ThemeToggle /> : null}
                  {showAppMenu ? <AppMenuButton /> : null}
                </View>
              ) : null}
            </View>

            {subtitle ? (
              <Text style={[styles.screenSubtitle, { color: colors.textMuted }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {children}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollViewport: { paddingBottom: 14 },
  backgroundLayer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  screenContent: { position: 'relative', overflow: 'hidden', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 48, gap: 18 },
  screenHeaderShell: { position: 'relative', overflow: 'hidden', borderRadius: 24, borderWidth: 1, padding: 18, shadowOpacity: 0.11, shadowOffset: { width: 0, height: 10 }, shadowRadius: 20, elevation: 4 },
  screenHeaderContent: { gap: 10 },
  screenHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  screenTitleBlock: { flex: 1, gap: 6 },
  screenHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  screenEyebrow: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1.1, textTransform: 'uppercase', overflow: 'hidden' },
  screenTitle: { fontSize: 28, fontFamily: 'Sora_800ExtraBold', letterSpacing: -0.5 },
  screenSubtitle: { fontSize: 14, lineHeight: 20, fontFamily: 'PlusJakartaSans_400Regular' },
});
