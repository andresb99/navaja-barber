import { PropsWithChildren } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useNavajaTheme } from '../../lib/theme';

export function Label({ children }: PropsWithChildren) {
  const { colors } = useNavajaTheme();
  return <Text style={[styles.label, { color: colors.text }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 4 },
});
