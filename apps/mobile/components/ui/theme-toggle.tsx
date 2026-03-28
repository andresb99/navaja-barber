import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button as HeroButton } from 'heroui-native';
import { useNavajaTheme } from '../../lib/theme';

export function ThemeToggle() {
  const { mode, toggleTheme, colors } = useNavajaTheme();
  const isDark = mode === 'dark';

  return (
    <HeroButton
      isIconOnly
      variant="secondary"
      onPress={() => {
        void toggleTheme();
      }}
      className="rounded-[16px]"
      style={[
        styles.themeToggle,
        {
          borderColor: colors.border,
          shadowColor: colors.shadow,
          backgroundColor: colors.panelRaised,
        },
      ]}
      accessibilityLabel={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
    >
      <Ionicons
        name={isDark ? 'sunny-outline' : 'moon-outline'}
        size={18}
        color={colors.text}
      />
    </HeroButton>
  );
}

const styles = StyleSheet.create({
  themeToggle: { position: 'relative', overflow: 'hidden', width: 44, height: 44, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 2 },
});
