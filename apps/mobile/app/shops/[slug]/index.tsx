import { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { formatCurrency } from '@navaja/shared';
import {
  ActionButton,
  Card,
  Chip,
  ErrorText,
  HeroPanel,
  MutedText,
  Screen,
  SurfaceCard,
} from '../../../components/ui/primitives';
import { formatDateTime } from '../../../lib/format';
import { listMarketplaceShops, saveMarketplaceShopId, type MarketplaceShop } from '../../../lib/marketplace';
import { supabase } from '../../../lib/supabase';
import { useNavajaTheme } from '../../../lib/theme';

interface ServiceRow {
  id: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
}

interface StaffRow {
  id: string;
  name: string;
  role: string;
}

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  submitted_at: string;
  staff_id: string | null;
}

function getRatingLabel(rating: number) {
  if (rating >= 5) return 'Excelente';
  if (rating >= 4) return 'Muy bueno';
  if (rating >= 3) return 'Bueno';
  return 'Regular';
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function ShopProfileScreen() {
  const { colors } = useNavajaTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [shop, setShop] = useState<MarketplaceShop | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [staffById, setStaffById] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!slug) {
        setError('Barberia no encontrada.');
        setLoading(false);
        return;
      }

      let active = true;

      void (async () => {
        setLoading(true);
        setError(null);

        try {
          const shops = await listMarketplaceShops();
          const found = shops.find((s) => s.slug === slug) || null;

          if (!active) return;
          if (!found) {
            setError('Barberia no encontrada.');
            setLoading(false);
            return;
          }

          setShop(found);

          const [{ data: servicesData }, { data: staffData }, { data: reviewsData }] =
            await Promise.all([
              supabase
                .from('services')
                .select('id, name, price_cents, duration_minutes')
                .eq('shop_id', found.id)
                .eq('is_active', true)
                .order('price_cents'),
              supabase
                .from('staff')
                .select('id, name, role')
                .eq('shop_id', found.id)
                .eq('is_active', true)
                .order('name'),
              supabase
                .from('appointment_reviews')
                .select('id, rating, comment, submitted_at, staff_id')
                .eq('shop_id', found.id)
                .eq('status', 'published')
                .eq('is_verified', true)
                .order('submitted_at', { ascending: false })
                .limit(5),
            ]);

          if (!active) return;

          const typedServices = (servicesData || []) as ServiceRow[];
          const typedStaff = (staffData || []) as StaffRow[];
          const typedReviews = (reviewsData || []) as ReviewRow[];

          setServices(typedServices);
          setStaff(typedStaff);
          setReviews(typedReviews);
          setStaffById(new Map(typedStaff.map((s) => [s.id, s.name])));
          setLoading(false);
        } catch (cause) {
          if (!active) return;
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar el perfil.');
          setLoading(false);
        }
      })();

      return () => {
        active = false;
      };
    }, [slug]),
  );

  async function handleBook() {
    if (!shop) return;
    await saveMarketplaceShopId(shop.id);
    router.push('/(tabs)/reservas');
  }

  async function handleCourses() {
    if (!shop) return;
    await saveMarketplaceShopId(shop.id);
    router.push('/(tabs)/cursos');
  }

  if (!loading && !shop && error) {
    return (
      <Screen eyebrow="Perfil" title="Barberia no encontrada">
        <Card>
          <MutedText>No pudimos encontrar esta barberia.</MutedText>
          <ActionButton label="Volver" variant="secondary" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  const locationLabel = shop
    ? [shop.locationLabel, shop.city, shop.region].filter(Boolean).join(' · ')
    : '';

  return (
    <Screen
      eyebrow={shop?.isVerified ? 'Barbershop verificada' : 'Barbershop activa'}
      title={shop?.name || 'Cargando...'}
      subtitle={locationLabel}
    >
      {loading ? (
        <Card>
          <MutedText>Cargando perfil...</MutedText>
        </Card>
      ) : null}

      <ErrorText message={error} />

      {!loading && shop ? (
        <>
          <HeroPanel
            eyebrow={shop.isVerified ? 'Verificada' : 'Activa'}
            title={shop.name}
            description={shop.description || 'Barberia activa en el marketplace de Beardly.'}
          >
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {shop.averageRating ? shop.averageRating.toFixed(1) : '—'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Rating</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>{shop.reviewCount}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Resenas</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {shop.activeServiceCount}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Servicios</Text>
              </View>
            </View>
          </HeroPanel>

          {shop.coverImageUrl ? (
            <Card style={styles.coverCard}>
              <Image
                source={{ uri: shop.coverImageUrl }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            </Card>
          ) : null}

          <Card elevated>
            <View style={styles.actionRow}>
              <ActionButton
                label="Reservar"
                onPress={() => void handleBook()}
                style={styles.actionBtn}
              />
              <ActionButton
                label="Cursos"
                variant="secondary"
                onPress={() => void handleCourses()}
                style={styles.actionBtn}
              />
            </View>
            <View style={styles.actionRow}>
              <ActionButton
                label="Empleo"
                variant="secondary"
                onPress={() => router.push(`/shops/${slug}/jobs`)}
                style={styles.actionBtn}
              />
              <ActionButton
                label="Modelos"
                variant="secondary"
                onPress={() => router.push(`/shops/${slug}/modelos`)}
                style={styles.actionBtn}
              />
            </View>
          </Card>

          {services.length > 0 ? (
            <Card elevated>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Servicios</Text>
              <View style={styles.list}>
                {services.map((service) => (
                  <SurfaceCard key={service.id} style={styles.listItem}>
                    <View style={styles.serviceRow}>
                      <View style={styles.serviceInfo}>
                        <Text style={[styles.serviceName, { color: colors.text }]}>
                          {service.name}
                        </Text>
                        <Text style={[styles.serviceMeta, { color: colors.textMuted }]}>
                          {formatDuration(service.duration_minutes)}
                        </Text>
                      </View>
                      <Chip label={formatCurrency(service.price_cents)} tone="success" />
                    </View>
                  </SurfaceCard>
                ))}
              </View>
            </Card>
          ) : null}

          {staff.length > 0 ? (
            <Card elevated>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Staff</Text>
              <View style={styles.list}>
                {staff.map((member) => (
                  <SurfaceCard key={member.id} style={styles.listItem}>
                    <View style={styles.staffRow}>
                      <Text style={[styles.staffName, { color: colors.text }]}>{member.name}</Text>
                      <Chip label={member.role} tone="neutral" />
                    </View>
                  </SurfaceCard>
                ))}
              </View>
            </Card>
          ) : null}

          {reviews.length > 0 ? (
            <Card elevated>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Resenas recientes</Text>
              <View style={styles.list}>
                {reviews.map((review) => (
                  <SurfaceCard key={review.id} style={styles.listItem}>
                    <View style={styles.reviewHeader}>
                      <Chip
                        label={`${review.rating} ★ ${getRatingLabel(review.rating)}`}
                        tone={
                          review.rating >= 4
                            ? 'success'
                            : review.rating >= 3
                              ? 'warning'
                              : 'danger'
                        }
                      />
                      <Text style={[styles.reviewDate, { color: colors.textMuted }]}>
                        {formatDateTime(review.submitted_at)}
                      </Text>
                    </View>
                    {review.comment ? (
                      <Text style={[styles.reviewComment, { color: colors.textSoft }]}>
                        "{review.comment}"
                      </Text>
                    ) : null}
                    {review.staff_id && staffById.get(review.staff_id) ? (
                      <Text style={[styles.reviewStaff, { color: colors.textMuted }]}>
                        Barbero: {staffById.get(review.staff_id)}
                      </Text>
                    ) : null}
                  </SurfaceCard>
                ))}
              </View>
            </Card>
          ) : null}

          {reviews.length === 0 ? (
            <Card>
              <MutedText>Sin resenas publicadas aun.</MutedText>
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coverCard: {
    padding: 0,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: 180,
    borderRadius: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  list: {
    gap: 8,
  },
  listItem: {
    padding: 12,
    borderRadius: 14,
    gap: 4,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  serviceInfo: {
    flex: 1,
    gap: 2,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '700',
  },
  serviceMeta: {
    fontSize: 12,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  staffName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  reviewDate: {
    fontSize: 11,
  },
  reviewComment: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  reviewStaff: {
    fontSize: 11,
  },
});
