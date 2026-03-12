import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { courseEnrollmentCreateSchema } from '@navaja/shared';
import {
  ActionButton,
  Card,
  ErrorText,
  Field,
  HeroPanel,
  Label,
  MutedText,
  Screen,
} from '../../components/ui/primitives';
import { createCourseEnrollmentViaApi, hasExternalApi } from '../../lib/api';
import { getAccessToken } from '../../lib/auth';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { useNavajaTheme } from '../../lib/theme';

WebBrowser.maybeCompleteAuthSession();

interface CourseData {
  id: string;
  shop_id: string;
  shop_name: string;
  title: string;
  description: string;
  price_cents: number;
  duration_hours: number;
  level: string;
}

interface SessionData {
  id: string;
  start_at: string;
  capacity: number;
  location: string;
}

function getPreferredPaymentMethodLabel(profile: {
  preferred_payment_method?: string | null;
  preferred_card_brand?: string | null;
  preferred_card_last4?: string | null;
} | null) {
  const preferredMethodRaw =
    (typeof profile?.preferred_payment_method === 'string' &&
      profile.preferred_payment_method.trim()) ||
    null;
  const preferredCardBrand =
    (typeof profile?.preferred_card_brand === 'string' && profile.preferred_card_brand.trim()) ||
    null;
  const preferredCardLast4 =
    (typeof profile?.preferred_card_last4 === 'string' && profile.preferred_card_last4.trim()) ||
    null;

  if (preferredMethodRaw === 'card') {
    return `Tarjeta${preferredCardBrand ? ` ${preferredCardBrand}` : ''}${preferredCardLast4 ? ` ****${preferredCardLast4}` : ''}`;
  }

  if (preferredMethodRaw === 'mercado_pago') {
    return 'Mercado Pago';
  }

  if (preferredMethodRaw === 'cash') {
    return 'Efectivo en local';
  }

  return null;
}

function normalizeReturnedParams(
  queryParams: Record<string, string | string[] | undefined | null>,
) {
  return Object.fromEntries(
    Object.entries(queryParams).flatMap(([key, value]) => {
      if (value == null) {
        return [];
      }

      if (Array.isArray(value)) {
        return value.length ? [[key, String(value[0] || '')]] : [];
      }

      return [[key, String(value)]];
    }),
  );
}

function navigateToReturnedUrl(urlValue: string) {
  const parsed = Linking.parse(urlValue);
  const normalizedPath = String(parsed.path || '').replace(/^\/+/, '');
  if (!normalizedPath) {
    return;
  }

  const params = normalizeReturnedParams(
    (parsed.queryParams || {}) as Record<string, string | string[] | undefined | null>,
  );

  router.replace({
    pathname: `/${normalizedPath}` as never,
    params: params as never,
  });
}

export default function CourseDetailsScreen() {
  const { colors } = useNavajaTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [course, setCourse] = useState<CourseData | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [defaultName, setDefaultName] = useState('');
  const [defaultPhone, setDefaultPhone] = useState('');
  const [defaultEmail, setDefaultEmail] = useState('');
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<string | null>(null);

  const [activeSessionId, setActiveSessionId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [activeSessionId, sessions],
  );

  const loadData = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    setError(null);

    const [
      { data: courseRow, error: courseError },
      { data: sessionRows, error: sessionsError },
      {
        data: { user },
      },
    ] = await Promise.all([
      supabase
        .from('courses')
        .select('id, shop_id, title, description, price_cents, duration_hours, level, is_active')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('course_sessions')
        .select('id, start_at, capacity, location')
        .eq('course_id', id)
        .eq('status', 'scheduled')
        .order('start_at'),
      supabase.auth.getUser(),
    ]);

    if (courseError || !courseRow || !courseRow.is_active) {
      setLoading(false);
      setCourse(null);
      setSessions([]);
      setError(courseError?.message || 'Curso no encontrado.');
      return;
    }

    if (sessionsError) {
      setLoading(false);
      setCourse(null);
      setSessions([]);
      setError(sessionsError.message);
      return;
    }

    const [{ data: shopRow }, { data: profile }] = await Promise.all([
      supabase
        .from('shops')
        .select('name')
        .eq('id', courseRow.shop_id)
        .eq('status', 'active')
        .maybeSingle(),
      user?.id
        ? supabase
            .from('user_profiles')
            .select(
              'full_name, phone, preferred_payment_method, preferred_card_brand, preferred_card_last4',
            )
            .eq('auth_user_id', user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const metadata = (user?.user_metadata as Record<string, unknown> | undefined) ?? undefined;
    const metadataFullName =
      (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) ||
      (typeof metadata?.name === 'string' && metadata.name.trim()) ||
      '';
    const initialName =
      (typeof profile?.full_name === 'string' && profile.full_name.trim()) ||
      metadataFullName ||
      '';
    const initialPhone = (typeof profile?.phone === 'string' && profile.phone.trim()) || '';
    const initialEmail = user?.email || '';

    setDefaultName(initialName);
    setDefaultPhone(initialPhone);
    setDefaultEmail(initialEmail);
    setPreferredPaymentMethod(getPreferredPaymentMethodLabel(profile));
    setName((current) => current || initialName);
    setPhone((current) => current || initialPhone);
    setEmail((current) => current || initialEmail);

    setCourse({
      id: String(courseRow.id),
      shop_id: String(courseRow.shop_id),
      shop_name: String(shopRow?.name || 'Barberia'),
      title: String(courseRow.title),
      description: String(courseRow.description || ''),
      price_cents: Number(courseRow.price_cents || 0),
      duration_hours: Number(courseRow.duration_hours || 0),
      level: String(courseRow.level || ''),
    });

    const mappedSessions = (sessionRows || []).map((session) => ({
      id: String(session.id),
      start_at: String(session.start_at),
      capacity: Number(session.capacity || 0),
      location: String(session.location || ''),
    }));

    setSessions(mappedSessions);
    setActiveSessionId((current) =>
      mappedSessions.some((session) => session.id === current) ? current : mappedSessions[0]?.id || '',
    );
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function submitEnrollment() {
    if (!activeSession) {
      setError('Selecciona una sesion.');
      return;
    }

    if (!hasExternalApi) {
      setError(
        'Configura EXPO_PUBLIC_API_BASE_URL para inscribirte con la misma logica de la web.',
      );
      return;
    }

    const parsed = courseEnrollmentCreateSchema.safeParse({
      session_id: activeSession.id,
      name,
      phone,
      email,
    });

    if (!parsed.success) {
      setError('Revisa los datos de inscripcion.');
      return;
    }

    setSending(true);
    setError(null);
    setMessage(null);

    try {
      const accessToken = await getAccessToken();
      const returnTo = Linking.createURL('/courses/enrollment/success');
      const response = await createCourseEnrollmentViaApi({
        sessionId: parsed.data.session_id,
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email,
        accessToken: accessToken || undefined,
        returnTo,
      });

      if (!response) {
        throw new Error('No se pudo iniciar la inscripcion desde mobile.');
      }

      if (response.requires_payment && response.checkout_url) {
        const result = await WebBrowser.openAuthSessionAsync(response.checkout_url, returnTo);
        if (result.type === 'success' && 'url' in result && result.url) {
          navigateToReturnedUrl(result.url);
          return;
        }

        if (result.type !== 'cancel' && result.type !== 'dismiss') {
          throw new Error('No se pudo completar el retorno del checkout.');
        }

        return;
      }

      setMessage('Inscripcion enviada. Te contactamos para confirmar el cupo.');
      setName(defaultName);
      setPhone(defaultPhone);
      setEmail(defaultEmail);
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar la inscripcion.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen
      eyebrow="Detalle"
      title="Informacion del curso y reserva de cupo"
      subtitle="La inscripcion usa la misma capa de negocio de la web, incluyendo validaciones, cupos y checkout si aplica."
    >
      {loading ? (
        <Card>
          <MutedText>Cargando curso...</MutedText>
        </Card>
      ) : null}

      <ErrorText message={error} />

      {!loading && !course ? (
        <Card>
          <MutedText>No hay informacion para este curso.</MutedText>
        </Card>
      ) : null}

      {course ? (
        <>
          <HeroPanel
            eyebrow={course.shop_name}
            title={course.title}
            description={course.description}
          >
            <Text style={[styles.metaItem, { color: colors.text }]}>Nivel: {course.level}</Text>
            <Text style={[styles.metaItem, { color: colors.text }]}>
              Duracion: {course.duration_hours} h
            </Text>
            <Text style={[styles.metaItem, { color: colors.text }]}>
              Inversion: {formatCurrency(course.price_cents)}
            </Text>
          </HeroPanel>

          <Card elevated>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Sesiones programadas</Text>
            {sessions.length === 0 ? (
              <MutedText>No hay sesiones activas en este momento.</MutedText>
            ) : null}
            <View style={styles.list}>
              {sessions.map((session) => (
                <Pressable
                  key={session.id}
                  style={[
                    styles.sessionRow,
                    {
                      backgroundColor:
                        activeSessionId === session.id ? colors.panelRaised : colors.panelMuted,
                      borderColor:
                        activeSessionId === session.id
                          ? colors.borderActive
                          : colors.borderMuted,
                    },
                  ]}
                  onPress={() => setActiveSessionId(session.id)}
                >
                  <Text style={[styles.sessionTitle, { color: colors.text }]}>
                    {formatDateTime(session.start_at)}
                  </Text>
                  <Text style={[styles.sessionMeta, { color: colors.textMuted }]}>
                    {session.location}
                  </Text>
                  <Text style={[styles.sessionMeta, { color: colors.textMuted }]}>
                    Capacidad: {session.capacity}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <Card elevated>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Anotarme a la sesion</Text>
            <Label>Nombre y apellido</Label>
            <Field value={name} onChangeText={setName} />
            <Label>Telefono</Label>
            <Field value={phone} onChangeText={setPhone} />
            <Label>Email</Label>
            <Field
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {preferredPaymentMethod ? (
              <Text style={[styles.helper, { color: colors.textMuted }]}>
                Metodo guardado: {preferredPaymentMethod}
              </Text>
            ) : null}
            {message ? <Text style={[styles.success, { color: colors.success }]}>{message}</Text> : null}
            <ActionButton
              label={sending ? 'Procesando...' : 'Anotarme'}
              onPress={submitEnrollment}
              disabled={!activeSession || !name || !phone || !email || sending}
              loading={sending}
            />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  metaItem: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontWeight: '800',
    fontSize: 17,
  },
  list: {
    gap: 8,
  },
  sessionRow: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 3,
  },
  sessionTitle: {
    fontWeight: '700',
    fontSize: 13,
  },
  sessionMeta: {
    fontSize: 12,
  },
  helper: {
    fontSize: 11,
  },
  success: {
    fontSize: 13,
  },
});
