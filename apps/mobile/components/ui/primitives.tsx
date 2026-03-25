import { PropsWithChildren, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Avatar as HeroAvatar,
  Button as HeroButton,
  Card as HeroCard,
  Chip as HeroChip,
  Input as HeroInput,
  Separator as HeroSeparator,
  Skeleton as HeroSkeleton,
  Spinner as HeroSpinner,
  TextArea as HeroTextArea,
} from 'heroui-native';
import { getStatusSurface, useNavajaTheme } from '../../lib/theme';
import { AppMenuButton } from '../navigation/app-menu';

function getSurfaceGradient(colors: ReturnType<typeof useNavajaTheme>['colors']) {
  return [colors.surfaceGradientStart, colors.surfaceGradientEnd] as const;
}

function getHeroGradient(colors: ReturnType<typeof useNavajaTheme>['colors']) {
  return [colors.heroGradientStart, colors.heroGradientEnd] as const;
}

function getSecondaryGradient(colors: ReturnType<typeof useNavajaTheme>['colors']) {
  if (colors.mode === 'dark') {
    return ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)'] as const;
  }
  return [colors.secondaryGradientStart, colors.secondaryGradientEnd] as const;
}

function getActiveGradient(colors: ReturnType<typeof useNavajaTheme>['colors']) {
  return [colors.activeGradientStart, colors.activeGradientEnd] as const;
}

function getPrimaryGradient(colors: ReturnType<typeof useNavajaTheme>['colors']) {
  return [colors.primaryGradientStart, colors.primaryGradientEnd] as const;
}

function getGlassTint(colors: ReturnType<typeof useNavajaTheme>['colors']) {
  return colors.mode === 'dark'
    ? (['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)'] as const)
    : (['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.06)'] as const);
}

function getSheenGradient(
  colors: ReturnType<typeof useNavajaTheme>['colors'],
  intensity: 'soft' | 'strong' = 'soft',
) {
  if (colors.mode === 'dark') {
    return intensity === 'strong'
      ? (['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0)'] as const)
      : (['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)', 'rgba(255,255,255,0)'] as const);
  }

  return intensity === 'strong'
    ? (['rgba(255,255,255,0.26)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0)'] as const)
    : (['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)'] as const);
}

function getCoolFade(colors: ReturnType<typeof useNavajaTheme>['colors']) {
  return colors.mode === 'dark'
    ? (['rgba(139,92,246,0.12)', 'rgba(139,92,246,0.04)', 'rgba(139,92,246,0)'] as const)
    : (['rgba(139,92,246,0.10)', 'rgba(139,92,246,0.03)', 'rgba(139,92,246,0)'] as const);
}

function getWarmFade(colors: ReturnType<typeof useNavajaTheme>['colors']) {
  return colors.mode === 'dark'
    ? (['rgba(63,63,70,0.22)', 'rgba(63,63,70,0.07)', 'rgba(63,63,70,0)'] as const)
    : (['rgba(217,70,239,0.07)', 'rgba(217,70,239,0.02)', 'rgba(217,70,239,0)'] as const);
}

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
      style={[baseStyles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={baseStyles.scrollViewport}
      showsVerticalScrollIndicator={false}
    >
      <View pointerEvents="none" style={baseStyles.backgroundLayer}>
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
          baseStyles.screenContent,
          contentStyle,
          {
            opacity: fade,
            transform: [{ translateY: lift }],
          },
        ]}
      >
        <View
          style={[
            baseStyles.screenHeaderShell,
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
          <View style={baseStyles.screenHeaderContent}>
            <View style={baseStyles.screenHeaderRow}>
              <View style={baseStyles.screenTitleBlock}>
                {eyebrow ? (
                  <Text
                    style={[
                      baseStyles.screenEyebrow,
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
                <Text style={[baseStyles.screenTitle, { color: colors.text }]}>{title}</Text>
              </View>
              {showThemeToggle || showAppMenu ? (
                <View style={baseStyles.screenHeaderActions}>
                  {showThemeToggle ? <ThemeToggle /> : null}
                  {showAppMenu ? <AppMenuButton /> : null}
                </View>
              ) : null}
            </View>

            {subtitle ? (
              <Text style={[baseStyles.screenSubtitle, { color: colors.textMuted }]}>
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

export function Card({
  children,
  style,
  elevated = false,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; elevated?: boolean }>) {
  const { colors } = useNavajaTheme();

  return (
    <HeroCard
      variant={elevated ? 'default' : 'secondary'}
      className="overflow-hidden p-0"
      style={[
        baseStyles.card,
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
        style={baseStyles.cardBeam}
      />
      <View style={baseStyles.cardContent}>{children}</View>
    </HeroCard>
  );
}

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
        style={baseStyles.surfaceBeam}
      />
      <View style={[baseStyles.surfaceContent, contentStyle]}>{children}</View>
    </>
  );

  const card = (
    <HeroCard
      variant={active ? 'default' : 'secondary'}
      className="overflow-hidden p-0"
      style={[
        baseStyles.surfaceCard,
        {
          borderColor,
          shadowColor: colors.shadow,
        },
        style,
      ]}
    >
      {inner}
    </HeroCard>
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
        baseStyles.heroPanel,
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
      <View style={baseStyles.heroContent}>
        {eyebrow ? (
          <Text
            style={[
              baseStyles.heroEyebrow,
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
        <Text style={[baseStyles.heroTitle, { color: colors.text }]}>{title}</Text>
        {description ? (
          <Text style={[baseStyles.heroDescription, { color: colors.textMuted }]}>
            {description}
          </Text>
        ) : null}
        {children}
      </View>
    </View>
  );
}

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
        baseStyles.statTile,
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
        style={baseStyles.statBeam}
      />
      <Text style={[baseStyles.statLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[baseStyles.statValue, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

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
        baseStyles.pillToggle,
        compact ? baseStyles.pillToggleCompact : null,
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
          baseStyles.pillToggleText,
          compact ? baseStyles.pillToggleTextCompact : null,
          { color: active ? colors.pillTextActive : colors.pillText },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ThemeToggle() {
  const { mode, toggleTheme, colors } = useNavajaTheme();
  const isDark = mode === 'dark';

  return (
    <HeroButton
      isIconOnly
      variant="secondary"
      onPress={() => {
        void toggleTheme();
      }}
      className="rounded-[16px]"
      style={[
        baseStyles.themeToggle,
        {
          borderColor: colors.border,
          shadowColor: colors.shadow,
          backgroundColor: colors.panelRaised,
        },
      ]}
      accessibilityLabel={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
    >
      <Ionicons
        name={isDark ? 'sunny-outline' : 'moon-outline'}
        size={18}
        color={colors.text}
      />
    </HeroButton>
  );
}

export function Label({ children }: PropsWithChildren) {
  const { colors } = useNavajaTheme();
  return <Text style={[baseStyles.label, { color: colors.text }]}>{children}</Text>;
}

export function Field(props: TextInputProps) {
  const { colors } = useNavajaTheme();
  const { style, ...inputProps } = props;

  return (
    <HeroInput
      {...inputProps}
      variant="primary"
      isBottomSheetAware={false}
      className="text-sm"
      placeholderColorClassName="text-muted"
      selectionColorClassName="accent-focus"
      style={[
        baseStyles.field,
        {
          borderColor: colors.inputBorder,
          backgroundColor: colors.input,
          color: colors.text,
        },
        style,
      ]}
    />
  );
}

export function MultilineField(props: TextInputProps) {
  const { colors } = useNavajaTheme();
  const { style, ...inputProps } = props;

  return (
    <HeroTextArea
      {...inputProps}
      variant="primary"
      isBottomSheetAware={false}
      className="text-sm"
      placeholderColorClassName="text-muted"
      selectionColorClassName="accent-focus"
      style={[
        baseStyles.field,
        baseStyles.multilineField,
        {
          borderColor: colors.inputBorder,
          backgroundColor: colors.input,
          color: colors.text,
        },
        style,
      ]}
    />
  );
}

export function ActionButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
  loading = false,
  style,
  textStyle,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const { colors, mode } = useNavajaTheme();
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';
  const dangerTone = getStatusSurface(colors, 'danger');

  const borderColor = isSecondary
    ? colors.border
    : isDanger
      ? dangerTone.borderColor
      : colors.borderMuted;
  const textColor = isSecondary
    ? colors.text
    : isDanger
      ? colors.inverseForeground
      : '#ffffff';
  const spinnerColor = isSecondary ? colors.text : textColor;
  const heroVariant = isDanger ? 'danger' : isSecondary ? 'secondary' : 'primary';

  return (
    <HeroButton
      variant={heroVariant}
      isDisabled={disabled || loading}
      onPress={onPress}
      className="overflow-hidden rounded-full"
      style={[
        baseStyles.button,
        {
          borderColor,
          shadowColor: colors.shadow,
          backgroundColor: 'transparent',
        },
        disabled ? baseStyles.buttonDisabled : null,
        style,
      ]}
    >
      {isDanger ? (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: dangerTone.backgroundColor,
            },
          ]}
        />
      ) : (
        <LinearGradient
          colors={
            isSecondary
              ? getSecondaryGradient(colors)
              : colors.mode === 'dark'
                ? (['#8b5cf6', '#6366f1'] as const)
                : getPrimaryGradient(colors)
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}

      {loading ? (
        <HeroSpinner size="sm" color={spinnerColor} />
      ) : (
        <Text style={[baseStyles.buttonText, { color: textColor }, textStyle]}>{label}</Text>
      )}
    </HeroButton>
  );
}

export function Chip({
  label,
  tone = 'neutral',
  style,
  textStyle,
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const { colors } = useNavajaTheme();

  const toneStyles =
    tone === 'success'
      ? getStatusSurface(colors, 'success')
      : tone === 'warning'
        ? getStatusSurface(colors, 'warning')
        : tone === 'danger'
          ? getStatusSurface(colors, 'danger')
          : {
              backgroundColor: colors.pillMuted,
              borderColor: colors.borderMuted,
              textColor: colors.text,
            };
  const heroColor =
    tone === 'success'
      ? 'success'
      : tone === 'warning'
        ? 'warning'
        : tone === 'danger'
          ? 'danger'
          : 'default';
  const heroVariant = tone === 'neutral' ? 'secondary' : 'soft';

  return (
    <HeroChip
      variant={heroVariant}
      color={heroColor}
      animation="disable-all"
      style={[
        baseStyles.chip,
        {
          backgroundColor: toneStyles.backgroundColor,
          borderColor: toneStyles.borderColor,
        },
        style,
      ]}
    >
      <Text style={[baseStyles.chipText, { color: toneStyles.textColor }, textStyle]}>{label}</Text>
    </HeroChip>
  );
}

export function SelectionChip({
  label,
  active = false,
  onPress,
  disabled = false,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const { colors } = useNavajaTheme();
  const textColor = active ? '#111f33' : colors.text;

  return (
    <HeroChip
      disabled={disabled}
      onPress={onPress}
      variant={active ? 'primary' : 'secondary'}
      color={active ? 'accent' : 'default'}
      animation="disable-all"
      style={[
        baseStyles.selectionChip,
        {
          backgroundColor: active ? colors.accent : colors.panelRaised,
          borderColor: active ? colors.borderActive : colors.borderMuted,
        },
        disabled ? baseStyles.buttonDisabled : null,
      ]}
    >
      <Text style={[baseStyles.selectionChipText, { color: textColor }]}>{label}</Text>
    </HeroChip>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  const { colors } = useNavajaTheme();
  if (!message) {
    return null;
  }

  const dangerTone = getStatusSurface(colors, 'danger');

  return (
    <Text
      style={[
        baseStyles.errorText,
        {
          color: dangerTone.textColor,
        },
      ]}
    >
      {message}
    </Text>
  );
}

export function MutedText({ children }: PropsWithChildren) {
  const { colors } = useNavajaTheme();
  return <Text style={[baseStyles.mutedText, { color: colors.textMuted }]}>{children}</Text>;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <View style={skeletonStyles.card}>
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

export function UserAvatar({
  url,
  initials,
  size = 'md',
}: {
  url?: string | null;
  initials?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <HeroAvatar size={size} color="accent" animation="disable-all" alt={initials || 'Avatar'}>
      {url ? (
        <HeroAvatar.Image source={{ uri: url }} />
      ) : null}
      <HeroAvatar.Fallback>{initials || ''}</HeroAvatar.Fallback>
    </HeroAvatar>
  );
}

export function Divider({ className }: { className?: string }) {
  return <HeroSeparator variant="thin" className={className ?? 'my-2'} />;
}

const skeletonStyles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
});

const baseStyles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollViewport: {
    paddingBottom: 14,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  screenContent: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 48,
    gap: 18,
  },
  screenHeaderShell: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    shadowOpacity: 0.11,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 4,
  },
  screenHeaderContent: {
    gap: 10,
  },
  screenHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  screenTitleBlock: {
    flex: 1,
    gap: 6,
  },
  screenHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenEyebrow: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    overflow: 'hidden',
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'Sora_800ExtraBold',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 3,
  },
  cardBeam: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 0,
    height: 1,
  },
  cardContent: {
    gap: 14,
  },
  surfaceCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 2,
  },
  surfaceBeam: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 0,
    height: 1,
  },
  surfaceContent: {
    gap: 8,
  },
  heroPanel: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 30,
    borderWidth: 1,
    padding: 20,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 4,
  },
  heroContent: {
    gap: 10,
  },
  heroEyebrow: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    overflow: 'hidden',
  },
  heroTitle: {
    fontSize: 25,
    fontFamily: 'Sora_800ExtraBold',
    letterSpacing: -0.45,
  },
  heroDescription: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  statTile: {
    position: 'relative',
    overflow: 'hidden',
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  statBeam: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 9,
    height: 1,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'Sora_800ExtraBold',
  },
  pillToggle: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillToggleCompact: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillToggleText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  pillToggleTextCompact: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  themeToggle: {
    position: 'relative',
    overflow: 'hidden',
    width: 44,
    height: 44,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
    marginBottom: 4,
  },
  field: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
  },
  multilineField: {
    minHeight: 100,
  },
  button: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  selectionChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionChipText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  mutedText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
});
