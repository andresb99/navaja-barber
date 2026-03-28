import { StyleSheet, TextInputProps } from 'react-native';
import { Input as HeroInput, TextArea as HeroTextArea } from 'heroui-native';
import { useNavajaTheme } from '../../lib/theme';

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
    <HeroTextArea
      {...inputProps}
      variant="primary"
      isBottomSheetAware={false}
      className="text-sm"
      placeholderColorClassName="text-muted"
      selectionColorClassName="accent-focus"
      style={[
        styles.field,
        styles.multilineField,
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

const styles = StyleSheet.create({
  field: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 12, fontSize: 14 },
  multilineField: { minHeight: 100 },
});
