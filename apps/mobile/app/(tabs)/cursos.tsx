import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  Card,
  HeroPanel,
  MutedText,
  PillToggle,
  Screen,
  StatTile,
} from '../../components/ui/primitives';
import { formatCurrency } from '../../lib/format';
import {
  listMarketplaceCourses,
  listMarketplaceShops,
  resolvePreferredMarketplaceShopId,
  type MarketplaceCourse,
  type MarketplaceShop,
} from '../../lib/marketplace';
import { useNavajaTheme } from '../../lib/theme';

export default function CursosScreen() {
  const { colors } = useNavajaTheme();
  const [shops, setShops] = useState<MarketplaceShop[]>([]);
  const [courses, setCourses] = useState<MarketplaceCourse[]>([]);
  const [preferredShopId, setPreferredShopId] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void (async () => {
        setLoading(true);
        setError(null);

        const [marketplaceShops, marketplaceCourses] = await Promise.all([
          listMarketplaceShops(),
          listMarketplaceCourses(),
        ]);

        if (!active) {
          return;
        }

        setShops(marketplaceShops);
        setCourses(marketplaceCourses);

        const nextPreferredShopId = await resolvePreferredMarketplaceShopId(marketplaceShops);
        if (!active) {
          return;
        }

        setPreferredShopId(nextPreferredShopId);
        setLoading(false);
      })().catch(() => {
        if (!active) {
          return;
        }

        setLoading(false);
        setError('No se pudo cargar el catalogo de cursos.');
      });

      return () => {
        active = false;
      };
    }, []),
  );

  const preferredShop = useMemo(
    () => shops.find((shop) => shop.id === preferredShopId) || null,
    [preferredShopId, shops],
  );
  const activeFilterShop = useMemo(
    () => shops.find((shop) => shop.id === activeFilter) || null,
    [activeFilter, shops],
  );
  const visibleCourses = useMemo(() => {
    if (activeFilter === 'all') {
      return courses;
    }

    return courses.filter((course) => course.shopId === activeFilter);
  }, [activeFilter, courses]);

  return (
    <Screen
      eyebrow="Cursos"
      title="Catalogo global de formacion"
      subtitle="Explora el catalogo de formacion, compara academia entre barberias y filtra por tenant."
    >
      <HeroPanel
        eyebrow="Academia marketplace"
        title="Todos los cursos activos en un solo lugar"
        description="Compara academia entre barberias y filtra por tenant cuando quieras afinar la vista."
      >
        <View style={styles.statsRow}>
          <StatTile label="Cursos" value={String(courses.length)} />
          <StatTile label="Barberias" value={String(shops.length)} />
          <StatTile
            label="Filtro"
            value={
              activeFilter === 'all'
                ? 'Global'
                : activeFilterShop?.name || preferredShop?.name || 'Tenant'
            }
          />
        </View>
      </HeroPanel>

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Filtrar cursos</Text>
        <View style={styles.filterWrap}>
          <PillToggle
            label="Todo el marketplace"
            active={activeFilter === 'all'}
            onPress={() => setActiveFilter('all')}
          />
          {shops.map((shop) => (
            <PillToggle
              key={shop.id}
              label={shop.name}
              active={activeFilter === shop.id}
              onPress={() => setActiveFilter(shop.id)}
            />
          ))}
        </View>
      </Card>

      {error ? (
        <Card>
          <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <MutedText>Cargando cursos...</MutedText>
        </Card>
      ) : null}

      {!loading && !visibleCourses.length ? (
        <Card>
          <MutedText>No hay cursos activos para el filtro seleccionado.</MutedText>
        </Card>
      ) : null}

      <View style={styles.list}>
        {visibleCourses.map((course) => (
          <Pressable
            key={course.id}
            onPress={() =>
              router.push({
                pathname: '/courses/[id]',
                params: { id: course.id },
              })
            }
          >
            <Card elevated>
              <Text style={[styles.shopName, { color: colors.textMuted }]}>{course.shopName}</Text>
              <Text style={[styles.courseTitle, { color: colors.text }]}>{course.title}</Text>
              <Text style={[styles.description, { color: colors.textSoft }]} numberOfLines={3}>
                {course.description}
              </Text>
              <View style={styles.metaGrid}>
                <Text style={[styles.metaItem, { color: colors.text }]}>
                  Nivel: {course.level}
                </Text>
                <Text style={[styles.metaItem, { color: colors.text }]}>
                  Duracion: {course.durationHours} h
                </Text>
                <Text style={[styles.metaItem, { color: colors.text }]}>
                  Inversion: {formatCurrency(course.priceCents)}
                </Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 19,
    fontFamily: 'Sora_700Bold',
  },
  filterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  error: {
    fontSize: 13,
  },
  list: {
    gap: 12,
  },
  shopName: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  courseTitle: {
    fontSize: 20,
    fontFamily: 'Sora_800ExtraBold',
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  metaGrid: {
    gap: 4,
  },
  metaItem: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
