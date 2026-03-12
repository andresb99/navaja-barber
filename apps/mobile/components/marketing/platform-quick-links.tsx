import { router } from 'expo-router';
import { publicMarketingHomeKeyRoutes } from '@navaja/shared';
import { StyleSheet, Text, View } from 'react-native';
import { Card, SurfaceCard } from '../ui/primitives';
import { useNavajaTheme } from '../../lib/theme';

export function PlatformQuickLinks({
  title = 'Explorar plataforma',
  description = 'Accede desde la app a las mismas superficies publicas clave que ya viven en web.',
  excludeHrefs = [],
}: {
  title?: string;
  description?: string;
  excludeHrefs?: string[];
}) {
  const { colors } = useNavajaTheme();
  const visibleRoutes = publicMarketingHomeKeyRoutes.filter((route) => !excludeHrefs.includes(route.href));

  return (
    <Card elevated>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>

      <View style={styles.list}>
        {visibleRoutes.map((route) => (
          <SurfaceCard
            key={route.href}
            onPress={() => router.push(route.href as never)}
            style={styles.routeCard}
          >
            <Text style={[styles.routeTitle, { color: colors.text }]}>{route.title}</Text>
            <Text style={[styles.routeDescription, { color: colors.textMuted }]}>
              {route.description}
            </Text>
          </SurfaceCard>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  list: {
    gap: 8,
  },
  routeCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 4,
  },
  routeTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  routeDescription: {
    fontSize: 12,
    lineHeight: 17,
  },
});
