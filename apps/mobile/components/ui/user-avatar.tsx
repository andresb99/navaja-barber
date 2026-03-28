import { Image, StyleSheet, Text, View } from 'react-native';
import { useNavajaTheme } from '../../lib/theme';

const sizeMap = { sm: 32, md: 40, lg: 56 } as const;
const fontSizeMap = { sm: 12, md: 14, lg: 20 } as const;

export function UserAvatar({
  url,
  initials,
  size = 'md',
}: {
  url?: string | null;
  initials?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { colors } = useNavajaTheme();
  const dim = sizeMap[size];
  const fontSize = fontSizeMap[size];

  return (
    <View
      style={[
        styles.container,
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: colors.accent,
        },
      ]}
    >
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: dim, height: dim, borderRadius: dim / 2 }}
          accessibilityLabel={initials || 'Avatar'}
        />
      ) : (
        <Text style={[styles.initials, { fontSize, color: '#ffffff' }]}>
          {initials || ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { fontFamily: 'PlusJakartaSans_700Bold' },
});
