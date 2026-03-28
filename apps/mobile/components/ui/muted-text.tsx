import { PropsWithChildren } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useNavajaTheme } from '../../lib/theme';

export function MutedText({ children }: PropsWithChildren) {
  const { colors } = useNavajaTheme();
  return <Text style={[styles.mutedText, { color: colors.textMuted }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  mutedText: { fontSize: 13, lineHeight: 18, fontFamily: 'PlusJakartaSans_400Regular' },
});
