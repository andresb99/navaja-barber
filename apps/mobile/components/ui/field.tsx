import { StyleSheet, TextInput, TextInputProps } from 'react-native';
import { useNavajaTheme } from '../../lib/theme';

export function Field(props: TextInputProps) {
  const { colors } = useNavajaTheme();
  const { style, ...inputProps } = props;

  return (
    <TextInput
      {...inputProps}
      placeholderTextColor={colors.textMuted}
      selectionColor={colors.focus}
      style={[
        styles.field,
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
    <TextInput
      {...inputProps}
      multiline
      placeholderTextColor={colors.textMuted}
      selectionColor={colors.focus}
      style={[
        styles.field,
        styles.multilineField,
        {
          borderColor: colors.inputBorder,
          backgroundColor: colors.input,
          color: colors.text,
          textAlignVertical: 'top',
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  field: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 12, fontSize: 14 },
  multilineField: { minHeight: 100 },
});
