import { StyleSheet, View } from 'react-native';
import { useNavajaTheme } from '../../lib/theme';

export function Divider({ className }: { className?: string }) {
  const { colors } = useNavajaTheme();

  return <View style={[styles.divider, { backgroundColor: colors.borderMuted }]} />;
}

const styles = StyleSheet.create({
  divider: { height: 1, marginVertical: 8 },
});
