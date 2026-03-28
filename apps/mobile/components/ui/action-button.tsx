import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button as HeroButton, Spinner as HeroSpinner } from 'heroui-native';
import { getStatusSurface, useNavajaTheme } from '../../lib/theme';
import { getPrimaryGradient, getSecondaryGradient } from './gradients';

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
        styles.button,
        {
          borderColor,
          shadowColor: colors.shadow,
          backgroundColor: 'transparent',
        },
        disabled ? styles.buttonDisabled : null,
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
        <Text style={[styles.buttonText, { color: textColor }, textStyle]}>{label}</Text>
      )}
    </HeroButton>
  );
}

const styles = StyleSheet.create({
  button: { position: 'relative', overflow: 'hidden', borderRadius: 999, borderWidth: 1, paddingVertical: 13, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', minHeight: 52, shadowOpacity: 0.1, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 3 },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, letterSpacing: 0.2 },
});
