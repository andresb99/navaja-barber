import { StyleProp, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import { Chip as HeroChip } from 'heroui-native';
import { getStatusSurface, useNavajaTheme } from '../../lib/theme';

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
        styles.chip,
        {
          backgroundColor: toneStyles.backgroundColor,
          borderColor: toneStyles.borderColor,
        },
        style,
      ]}
    >
      <Text style={[styles.chipText, { color: toneStyles.textColor }, textStyle]}>{label}</Text>
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
        styles.selectionChip,
        {
          backgroundColor: active ? colors.accent : colors.panelRaised,
          borderColor: active ? colors.borderActive : colors.borderMuted,
        },
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      <Text style={[styles.selectionChipText, { color: textColor }]}>{label}</Text>
    </HeroChip>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  chipText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
  selectionChip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  selectionChipText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
  buttonDisabled: { opacity: 0.55 },
});
