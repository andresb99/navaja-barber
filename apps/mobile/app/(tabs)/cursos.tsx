import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  ActionButton,
  Card,
  Chip,
  HeroPanel,
  MutedText,
  PillToggle,
  Screen,
  SkeletonCard,
  StatTile,
  SurfaceCard,
  UserAvatar,
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

function getShopInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0] || '')
    .join('')
    .toUpperCase();
}

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
        <>
          <SkeletonCard lines={4} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={4} />
        </>
      ) : null}

      {!loading && !visibleCourses.length ? (
        <Card>
          <MutedText>No hay cursos activos para el filtro seleccionado.</MutedText>
        </Card>
      ) : null}

      <View style={styles.list}>
        {visibleCourses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            onPress={() =>
              router.push({
                pathname: '/courses/[id]',
                params: { id: course.id },
              })
            }
            onShopPress={() => setActiveFilter(course.shopId)}
          />
        ))}
      </View>
    </Screen>
  );
}

function CourseCard({
  course,
  onPress,
  onShopPress,
}: {
  course: MarketplaceCourse;
  onPress: () => void;
  onShopPress: () => void;
}) {
  const { colors } = useNavajaTheme();
  const initials = getShopInitials(course.shopName);

  return (
    <SurfaceCard style={styles.courseCard}>
      <View style={styles.courseTopRow}>
        {course.level ? (
          <Chip label={course.level} tone="neutral" style={styles.levelChip} />
        ) : null}
        <View style={styles.courseTopRight}>
          <UserAvatar initials={initials} size="sm" />
        </View>
      </View>

      <Text style={[styles.courseShop, { color: colors.textMuted }]}>{course.shopName}</Text>
      <Text style={[styles.courseTitle, { color: colors.text }]}>{course.title}</Text>

      {course.description ? (
        <Text style={[styles.courseDescription, { color: colors.textSoft }]} numberOfLines={2}>
          {course.description}
        </Text>
      ) : null}

      <View style={styles.courseMeta}>
        <CourseMetaRow label="Nivel" value={course.level} colors={colors} />
        <CourseMetaRow label="Duracion" value={`${course.durationHours} horas`} colors={colors} />
        <CourseMetaRow label="Barberia" value={course.shopName} colors={colors} />
      </View>

      <View style={styles.coursePriceRow}>
        <Text style={[styles.coursePriceLabel, { color: colors.textMuted }]}>Inversion</Text>
        <Text style={[styles.coursePrice, { color: colors.text }]}>
          {formatCurrency(course.priceCents)}
        </Text>
      </View>

      <View style={styles.courseActions}>
        <ActionButton
          label="Ver curso"
          onPress={onPress}
          style={styles.courseActionPrimary}
        />
        <ActionButton
          label="Ver academia"
          variant="secondary"
          onPress={onShopPress}
          style={styles.courseActionSecondary}
        />
      </View>
    </SurfaceCard>
  );
}

function CourseMetaRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useNavajaTheme>['colors'];
}) {
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: colors.text }]}>{value}</Text>
    </View>
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
    gap: 16,
  },
  courseCard: {
    borderRadius: 28,
    padding: 20,
    gap: 12,
  },
  courseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  courseTopRight: {
    marginLeft: 'auto',
  },
  levelChip: {
    alignSelf: 'flex-start',
  },
  courseShop: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginTop: -4,
  },
  courseTitle: {
    fontSize: 22,
    fontFamily: 'Sora_800ExtraBold',
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  courseDescription: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  courseMeta: {
    gap: 4,
    paddingVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  metaValue: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  coursePriceRow: {
    gap: 2,
  },
  coursePriceLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  coursePrice: {
    fontSize: 32,
    fontFamily: 'Sora_800ExtraBold',
    letterSpacing: -0.8,
  },
  courseActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  courseActionPrimary: {
    flex: 1,
  },
  courseActionSecondary: {
    flex: 1,
  },
});
