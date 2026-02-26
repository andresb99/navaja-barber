import { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { palette } from '../../lib/theme';

export function Screen({
  title,
  subtitle,
  children,
  contentStyle,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  contentStyle?: StyleProp<ViewStyle>;
}>) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.screenContent, contentStyle]}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>{title}</Text>
        {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children }: PropsWithChildren) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Field(props: TextInputProps) {
  return <TextInput {...props} style={[styles.field, props.style]} placeholderTextColor="#94a3b8" />;
}

export function MultilineField(props: TextInputProps) {
  return (
    <TextInput
      {...props}
      multiline
      textAlignVertical="top"
      style={[styles.field, styles.multilineField, props.style]}
      placeholderTextColor="#94a3b8"
    />
  );
}

export function ActionButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
  loading = false,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}) {
  const variantStyle =
    variant === 'secondary'
      ? styles.secondaryButton
      : variant === 'danger'
        ? styles.dangerButton
        : styles.primaryButton;

  const textStyle =
    variant === 'secondary'
      ? styles.secondaryButtonText
      : variant === 'danger'
        ? styles.dangerButtonText
        : styles.primaryButtonText;

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.button, variantStyle, disabled ? styles.buttonDisabled : null]}
    >
      {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[styles.buttonText, textStyle]}>{label}</Text>}
    </Pressable>
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
  const toneStyle =
    tone === 'success'
      ? styles.chipSuccess
      : tone === 'warning'
        ? styles.chipWarning
        : tone === 'danger'
          ? styles.chipDanger
          : styles.chipNeutral;

  return (
    <View style={[styles.chip, toneStyle, style]}>
      <Text style={[styles.chipText, textStyle]}>{label}</Text>
    </View>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return <Text style={styles.errorText}>{message}</Text>;
}

export function MutedText({ children }: PropsWithChildren) {
  return <Text style={styles.mutedText}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  screenContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 24,
  },
  screenHeader: {
    marginBottom: 6,
  },
  screenTitle: {
    color: palette.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  screenSubtitle: {
    marginTop: 4,
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: palette.panel,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 15,
    gap: 9,
    shadowColor: '#0f172a',
    shadowOpacity: 0.09,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 2,
  },
  label: {
    color: '#23344d',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  field: {
    borderWidth: 1,
    borderColor: '#c6d0dd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    color: palette.text,
    fontSize: 14,
  },
  multilineField: {
    minHeight: 100,
  },
  button: {
    borderRadius: 13,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButton: {
    backgroundColor: palette.primary,
  },
  secondaryButton: {
    backgroundColor: '#fff4db',
    borderWidth: 1,
    borderColor: '#f0d49a',
  },
  dangerButton: {
    backgroundColor: palette.danger,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 14,
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButtonText: {
    color: '#7a4c04',
  },
  dangerButtonText: {
    color: '#ffffff',
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  chipNeutral: {
    backgroundColor: '#e2e8f0',
  },
  chipSuccess: {
    backgroundColor: '#ccfbf1',
  },
  chipWarning: {
    backgroundColor: '#fef3c7',
  },
  chipDanger: {
    backgroundColor: '#fee2e2',
  },
  chipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
  },
  mutedText: {
    color: palette.textMuted,
    fontSize: 13,
  },
});
