import { StyleSheet, Text } from 'react-native';
import { getStatusSurface, useNavajaTheme } from '../../lib/theme';

export function ErrorText({ message }: { message: string | null }) {
  const { colors } = useNavajaTheme();
  if (!message) {
    return null;
  }

  const dangerTone = getStatusSurface(colors, 'danger');

  return (
    <Text
      style={[
        styles.errorText,
        {
          color: dangerTone.textColor,
        },
      ]}
    >
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  errorText: { fontSize: 13, lineHeight: 18, fontFamily: 'PlusJakartaSans_400Regular' },
});
