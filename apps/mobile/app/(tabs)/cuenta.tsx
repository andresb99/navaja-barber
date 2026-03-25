import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  ActionButton,
  Card,
  Chip,
  Divider,
  ErrorText,
  Field,
  HeroPanel,
  Label,
  MutedText,
  PillToggle,
  Screen,
  SkeletonCard,
  SurfaceCard,
  UserAvatar,
} from '../../components/ui/primitives';
import { PlatformQuickLinks } from '../../components/marketing/platform-quick-links';
import {
  getAppAdminStatusViaApi,
  hasExternalApi,
  listAccountAppointmentsViaApi,
  respondToInvitationViaApi,
} from '../../lib/api';
import { AppRole, getAuthContext } from '../../lib/auth';
import { formatDateTime } from '../../lib/format';
import { listMarketplaceShops } from '../../lib/marketplace';
import { supabase } from '../../lib/supabase';
import { useNavajaTheme } from '../../lib/theme';

interface MyAppointment {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  payment_status: string | null;
  service_name: string | null;
  staff_name: string | null;
  has_review: boolean;
  review_rating: number | null;
}

interface InvitationItem {
  id: string;
  role: string;
  createdAt: string;
  shopName: string;
  shopSlug: string | null;
}

interface AccountSystemNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

const roleLabel: Record<AppRole, string> = {
  guest: 'Invitado',
  user: 'Cliente',
  staff: 'Staff',
  admin: 'Admin',
};

const toneByRole: Record<AppRole, 'neutral' | 'success' | 'warning' | 'danger'> = {
  guest: 'neutral',
  user: 'neutral',
  staff: 'warning',
  admin: 'success',
};

const bookingStatusLabel: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  no_show: 'No asistio',
  done: 'Realizada',
};

const paymentStatusLabel: Record<string, string> = {
  pending: 'Pago pendiente',
  processing: 'Pago procesando',
  approved: 'Pago aprobado',
  rejected: 'Pago rechazado',
  cancelled: 'Pago cancelado',
  refunded: 'Pago devuelto',
  expired: 'Pago vencido',
};

function isMissingAccountNotificationsTableError(error: unknown) {
  if (!error) {
    return false;
  }

  const maybeError = error as { code?: string; message?: string };
  const code = String(maybeError.code || '').toUpperCase();
  const message = String(maybeError.message || error || '').toLowerCase();

  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    (message.includes('account_notifications') &&
      (message.includes('does not exist') || message.includes('schema cache') || message.includes('not found')))
  );
}

function notificationTone(
  type: string,
): 'neutral' | 'success' | 'warning' | 'danger' {
  if (type === 'appointment_confirmed') {
    return 'success';
  }

  if (type === 'appointment_cancelled') {
    return 'danger';
  }

  if (type === 'review_requested') {
    return 'warning';
  }

  return 'neutral';
}

export default function CuentaScreen() {
  const { colors } = useNavajaTheme();
  const [role, setRole] = useState<AppRole>('guest');
  const [userId, setUserId] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<'mercado_pago' | 'card' | 'cash' | ''>('');
  const [preferredCardBrand, setPreferredCardBrand] = useState<string>('');
  const [preferredCardLast4, setPreferredCardLast4] = useState<string>('');
  const [appointments, setAppointments] = useState<MyAppointment[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [accountNotifications, setAccountNotifications] = useState<AccountSystemNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingInvitationId, setProcessingInvitationId] = useState<string | null>(null);
  const [processingNotificationId, setProcessingNotificationId] = useState<string | null>(null);
  const [canAccessAppAdmin, setCanAccessAppAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canEditProfile = useMemo(
    () => Boolean(userId && (role === 'user' || role === 'staff' || role === 'admin')),
    [role, userId],
  );
  const reviewableAppointments = useMemo(
    () => appointments.filter((item) => item.status === 'done' && !item.has_review),
    [appointments],
  );
  const unreadAccountNotifications = useMemo(
    () => accountNotifications.filter((item) => !item.isRead),
    [accountNotifications],
  );

  const loadAccount = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    const auth = await getAuthContext();
    setRole(auth.role);
    setEmail(auth.email || '');
    setUserId(auth.userId || '');

    if (auth.userId) {
      const [{ data: profile }, { data: membershipRows }, { data: notificationRows, error: notificationsError }, marketplaceShops] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('full_name, phone, avatar_url, preferred_payment_method, preferred_card_brand, preferred_card_last4')
          .eq('auth_user_id', auth.userId)
          .maybeSingle(),
        supabase
          .from('shop_memberships')
          .select('id, shop_id, role, created_at')
          .eq('user_id', auth.userId)
          .eq('membership_status', 'invited')
          .order('created_at', { ascending: false }),
        supabase
          .from('account_notifications')
          .select('id, notification_type, title, message, action_url, is_read, created_at')
          .eq('user_id', auth.userId)
          .order('created_at', { ascending: false })
          .limit(40),
        listMarketplaceShops(),
      ]);

      setFullName(String(profile?.full_name || ''));
      setPhone(String(profile?.phone || ''));
      setAvatarUrl(String(profile?.avatar_url || ''));
      const rawPpm = String(profile?.preferred_payment_method || '');
      setPreferredPaymentMethod(
        rawPpm === 'mercado_pago' || rawPpm === 'card' || rawPpm === 'cash' ? rawPpm : '',
      );
      setPreferredCardBrand(String(profile?.preferred_card_brand || ''));
      setPreferredCardLast4(String(profile?.preferred_card_last4 || ''));

      const shopIds = [...new Set((membershipRows || []).map((item) => String(item.shop_id || '')))];
      const { data: inviteShops } = shopIds.length
        ? await supabase
            .from('shops')
            .select('id, name, slug')
            .in('id', shopIds)
            .eq('status', 'active')
        : { data: [] as Array<{ id: string; name: string; slug: string | null }> };
      const shopsById = new Map(
        ((inviteShops || []) as Array<{ id: string; name: string; slug: string | null }>).map((item) => [
          String(item.id),
          {
            name: String(item.name),
            slug: item.slug ? String(item.slug) : null,
          },
        ]),
      );

      setInvitations(
        (membershipRows || []).map((item) => ({
          id: String(item.id),
          role: String(item.role || 'staff'),
          createdAt: String(item.created_at),
          shopName: shopsById.get(String(item.shop_id || ''))?.name || 'Barberia',
          shopSlug: shopsById.get(String(item.shop_id || ''))?.slug || null,
        })),
      );

      if (notificationsError && !isMissingAccountNotificationsTableError(notificationsError)) {
        setError(notificationsError.message);
      } else {
        setAccountNotifications(
          ((notificationRows || []) as Array<Record<string, unknown>>).map((item) => ({
            id: String(item.id || ''),
            type: String(item.notification_type || 'info'),
            title: String(item.title || 'Notificacion'),
            message: String(item.message || ''),
            actionUrl:
              typeof item.action_url === 'string' && item.action_url.trim()
                ? String(item.action_url)
                : null,
            isRead: Boolean(item.is_read),
            createdAt: String(item.created_at || ''),
          })),
        );
      }

      if (auth.role === 'user' || auth.role === 'staff' || auth.role === 'admin') {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const accessToken = session?.access_token || '';

        if (hasExternalApi && accessToken) {
          try {
            const statusResponse = await getAppAdminStatusViaApi({ accessToken });
            setCanAccessAppAdmin(Boolean(statusResponse?.is_platform_admin));
          } catch {
            setCanAccessAppAdmin(false);
          }
        } else {
          setCanAccessAppAdmin(false);
        }

        let loaded = false;
        if (hasExternalApi && accessToken) {
          try {
            const response = await listAccountAppointmentsViaApi({
              accessToken,
            });
            if (response?.items) {
              setAppointments(
                response.items
                  .map((item) => ({
                    id: String(item.id),
                    start_at: String(item.startAt),
                    end_at: String(item.startAt),
                    status: String(item.status || 'pending'),
                    payment_status:
                      typeof item.paymentStatus === 'string' && item.paymentStatus.trim()
                        ? String(item.paymentStatus)
                        : null,
                    service_name: item.serviceName ? String(item.serviceName) : null,
                    staff_name: item.staffName ? String(item.staffName) : null,
                    has_review: Boolean(item.hasReview),
                    review_rating:
                      item.reviewRating === null || item.reviewRating === undefined
                        ? null
                        : Number(item.reviewRating),
                  }))
                  .sort((a, b) => (a.start_at < b.start_at ? 1 : -1)),
              );
              loaded = true;
            }
          } catch {
            loaded = false;
          }
        }

        if (!loaded) {
          const appointmentResponses = await Promise.all(
            marketplaceShops.map((shop) =>
              supabase.rpc('get_my_appointments', {
                p_shop_id: shop.id,
              }),
            ),
          );
          const failedResponse = appointmentResponses.find((result) => result.error);

          if (failedResponse?.error) {
            setAppointments([]);
            setError(failedResponse.error.message);
          } else {
            const mergedAppointments = appointmentResponses
              .flatMap((result) => (result.data || []) as Array<Record<string, unknown>>)
              .map((item) => ({
                id: String(item.id),
                start_at: String(item.start_at),
                end_at: String(item.end_at),
                status: String(item.status),
                payment_status: null,
                service_name: item.service_name ? String(item.service_name) : null,
                staff_name: item.staff_name ? String(item.staff_name) : null,
                has_review: false,
                review_rating: null,
              }))
              .sort((a, b) => (a.start_at < b.start_at ? 1 : -1));

            setAppointments(mergedAppointments);
          }
        }
      } else {
        setCanAccessAppAdmin(false);
        setAppointments([]);
      }
    } else {
      setFullName('');
      setPhone('');
      setAvatarUrl('');
      setInvitations([]);
      setAccountNotifications([]);
      setCanAccessAppAdmin(false);
      setAppointments([]);
    }

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAccount();
    }, [loadAccount]),
  );

  async function saveProfile() {
    if (!userId) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    if (preferredPaymentMethod === 'card' && preferredCardLast4 && !/^\d{4}$/.test(preferredCardLast4)) {
      setSaving(false);
      setError('Los ultimos 4 digitos de la tarjeta deben ser exactamente 4 numeros.');
      return;
    }

    const { error: saveError } = await supabase.from('user_profiles').upsert(
      {
        auth_user_id: userId,
        full_name: fullName || null,
        phone: phone || null,
        avatar_url: avatarUrl || null,
        preferred_payment_method: preferredPaymentMethod || null,
        preferred_card_brand: preferredPaymentMethod === 'card' ? preferredCardBrand || null : null,
        preferred_card_last4: preferredPaymentMethod === 'card' ? preferredCardLast4 || null : null,
      },
      { onConflict: 'auth_user_id' },
    );

    if (saveError) {
      setSaving(false);
      setError(saveError.message);
      return;
    }

    setSaving(false);
    setMessage('Perfil actualizado.');
  }

  async function signOut() {
    await supabase.auth.signOut();
    await loadAccount();
  }

  async function respondToInvitation(membershipId: string, decision: 'accept' | 'decline') {
    setProcessingInvitationId(membershipId);
    setError(null);
    setMessage(null);

    try {
      if (!hasExternalApi) {
        throw new Error(
          'Configura EXPO_PUBLIC_API_BASE_URL para responder invitaciones desde mobile.',
        );
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token || '';
      if (!accessToken) {
        throw new Error('Debes iniciar sesion para responder invitaciones.');
      }

      const result = await respondToInvitationViaApi({
        accessToken,
        membershipId,
        decision,
      });

      if (!result?.success) {
        throw new Error('No se pudo actualizar la invitacion.');
      }

      setInvitations((current) => current.filter((item) => item.id !== membershipId));
      setMessage(
        decision === 'accept'
          ? 'Invitacion aceptada. Ya puedes entrar al panel correspondiente.'
          : 'Invitacion rechazada.',
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo actualizar la invitacion.',
      );
    } finally {
      setProcessingInvitationId(null);
    }
  }

  async function markNotificationAsRead(notificationId: string) {
    if (!userId) {
      return;
    }

    setProcessingNotificationId(notificationId);
    setError(null);
    setMessage(null);

    const readAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('account_notifications')
      .update({
        is_read: true,
        read_at: readAt,
      })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .eq('is_read', false);

    if (updateError) {
      setProcessingNotificationId(null);
      setError(updateError.message);
      return;
    }

    setAccountNotifications((current) =>
      current.map((item) =>
        item.id === notificationId
          ? {
              ...item,
              isRead: true,
            }
          : item,
      ),
    );
    setProcessingNotificationId(null);
  }

  function openNotificationAction(item: AccountSystemNotificationItem) {
    if (!item.actionUrl) {
      return;
    }

    const reviewMatch = item.actionUrl.match(/^\/cuenta\/resenas\/([0-9a-fA-F-]{36})$/);
    if (reviewMatch?.[1]) {
      router.push({
        pathname: '/cuenta/resenas/[appointmentId]',
        params: { appointmentId: reviewMatch[1] },
      });
      return;
    }

    if (item.actionUrl.startsWith('/cuenta')) {
      router.push('/(tabs)/cuenta');
    }
  }

  return (
    <Screen
      eyebrow="Cuenta"
      title="Perfil, invitaciones y reservas"
      subtitle="La cuenta mobile sigue la estructura principal de la web: perfil editable, notificaciones, reservas y reseñas."
    >
      <HeroPanel
        eyebrow="Mi cuenta"
        title={email || 'Sin sesion activa'}
        description={
          role === 'guest'
            ? 'Ingresa para sincronizar perfil, invitaciones y reservas.'
            : 'Tu rol actual define que paneles puedes abrir desde la app.'
        }
      >
        <Chip label={roleLabel[role]} tone={toneByRole[role]} />
      </HeroPanel>

      <PlatformQuickLinks
        title="Plataforma y planes"
        description="Desde mobile ya puedes abrir las mismas superficies publicas principales que existen en web, incluidos software, agenda y planes."
      />

      <Card elevated>
        <View style={styles.profileHeader}>
          <UserAvatar
            url={avatarUrl}
            initials={fullName ? fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : email.slice(0, 2).toUpperCase()}
            size="lg"
          />
          <View style={styles.profileHeaderText}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Mi perfil</Text>
            {email ? <Text style={[styles.profileEmail, { color: colors.textMuted }]}>{email}</Text> : null}
          </View>
        </View>
        <Divider />
        {loading ? (
          <SkeletonCard lines={3} />
        ) : canEditProfile ? (
          <>
            <Label>Nombre y apellido</Label>
            <Field value={fullName} onChangeText={setFullName} />
            <Label>Telefono</Label>
            <Field value={phone} onChangeText={setPhone} />
            <Label>Avatar URL (opcional)</Label>
            <Field
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <Label>Metodo de pago preferido</Label>
            <View style={styles.paymentMethodRow}>
              {([
                { value: '', label: 'Sin preferencia' },
                { value: 'mercado_pago', label: 'Mercado Pago' },
                { value: 'card', label: 'Tarjeta' },
                { value: 'cash', label: 'Efectivo' },
              ] as Array<{ value: typeof preferredPaymentMethod; label: string }>).map((opt) => (
                <PillToggle
                  key={opt.value}
                  label={opt.label}
                  active={preferredPaymentMethod === opt.value}
                  onPress={() => setPreferredPaymentMethod(opt.value)}
                />
              ))}
            </View>
            {preferredPaymentMethod === 'card' ? (
              <>
                <Label>Marca de tarjeta (ej: Visa)</Label>
                <Field value={preferredCardBrand} onChangeText={setPreferredCardBrand} />
                <Label>Ultimos 4 digitos</Label>
                <Field
                  value={preferredCardLast4}
                  onChangeText={setPreferredCardLast4}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </>
            ) : null}
            <ActionButton
              label={saving ? 'Guardando...' : 'Guardar perfil'}
              onPress={saveProfile}
              loading={saving}
              disabled={saving}
            />
          </>
        ) : (
          <MutedText>Inicia sesion para editar tu perfil.</MutedText>
        )}

        {message ? <Text style={[styles.success, { color: colors.success }]}>{message}</Text> : null}
        <ErrorText message={error} />

        <View style={styles.actions}>
          {role === 'guest' ? (
            <ActionButton
              label="Ingresar o registrarme"
              onPress={() => router.push('/(auth)/login')}
            />
          ) : (
            <ActionButton label="Cerrar sesion" variant="danger" onPress={signOut} />
          )}

          <ActionButton
            label={role === 'guest' ? 'Ver planes' : 'Gestionar suscripcion'}
            variant="secondary"
            onPress={() => router.push('/suscripcion')}
          />

          {role === 'staff' || role === 'admin' ? (
            <ActionButton
              label="Ir a panel staff"
              variant="secondary"
              onPress={() => router.push('/staff/index')}
            />
          ) : null}

          {role === 'admin' ? (
            <ActionButton
              label="Ir a panel admin"
              variant="secondary"
              onPress={() => router.push('/admin')}
            />
          ) : null}

          {canAccessAppAdmin ? (
            <ActionButton
              label="Ir a app admin"
              variant="secondary"
              onPress={() => router.push('/app-admin')}
            />
          ) : null}
        </View>
      </Card>

      <Card elevated>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Notificaciones</Text>
          <Chip
            label={`${invitations.length + unreadAccountNotifications.length} pendiente${invitations.length + unreadAccountNotifications.length === 1 ? '' : 's'}`}
            tone={invitations.length + unreadAccountNotifications.length ? 'warning' : 'neutral'}
          />
        </View>

        {!accountNotifications.length && !invitations.length ? (
          <MutedText>No tienes notificaciones pendientes en este momento.</MutedText>
        ) : null}

        <Text style={[styles.subSectionTitle, { color: colors.textMuted }]}>
          Actividad de citas
        </Text>
        {!accountNotifications.length ? (
          <MutedText>No hay novedades de citas para mostrar.</MutedText>
        ) : null}
        <View style={styles.list}>
          {accountNotifications.map((item) => (
            <SurfaceCard key={item.id} style={styles.infoCard}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>{item.title}</Text>
                <Chip
                  label={item.isRead ? 'Leida' : 'Nueva'}
                  tone={item.isRead ? 'neutral' : notificationTone(item.type)}
                />
              </View>
              <Text style={[styles.infoMeta, { color: colors.textMuted }]}>{item.message}</Text>
              <Text style={[styles.infoMeta, { color: colors.textMuted }]}>
                {formatDateTime(item.createdAt)}
              </Text>
              <View style={styles.inviteActions}>
                {item.actionUrl ? (
                  <ActionButton
                    label="Ver detalle"
                    variant="secondary"
                    onPress={() => openNotificationAction(item)}
                  />
                ) : null}
                {!item.isRead ? (
                  <ActionButton
                    label={
                      processingNotificationId === item.id
                        ? 'Actualizando...'
                        : 'Marcar como leida'
                    }
                    onPress={() => {
                      void markNotificationAsRead(item.id);
                    }}
                    disabled={processingNotificationId === item.id}
                  />
                ) : null}
              </View>
            </SurfaceCard>
          ))}
        </View>

        <Text style={[styles.subSectionTitle, { color: colors.textMuted }]}>
          Invitaciones de equipo
        </Text>
        {!invitations.length ? (
          <MutedText>No tienes invitaciones pendientes en este momento.</MutedText>
        ) : null}

        <View style={styles.list}>
          {invitations.map((item) => (
            <SurfaceCard key={item.id} style={styles.infoCard}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>{item.shopName}</Text>
              <Text style={[styles.infoMeta, { color: colors.textMuted }]}>
                Rol propuesto: {item.role === 'admin' ? 'Administrador' : 'Staff'}
              </Text>
              <Text style={[styles.infoMeta, { color: colors.textMuted }]}>
                Recibida el {formatDateTime(item.createdAt)}
              </Text>
              <View style={styles.inviteActions}>
                <ActionButton
                  label={
                    processingInvitationId === item.id ? 'Procesando...' : 'Aceptar invitacion'
                  }
                  onPress={() => {
                    void respondToInvitation(item.id, 'accept');
                  }}
                  disabled={processingInvitationId === item.id}
                />
                <ActionButton
                  label="Rechazar"
                  variant="secondary"
                  onPress={() => {
                    void respondToInvitation(item.id, 'decline');
                  }}
                  disabled={processingInvitationId === item.id}
                />
              </View>
              {item.shopSlug ? (
                <ActionButton
                  label="Ver barberia"
                  variant="secondary"
                  onPress={() => router.push('/(tabs)/inicio')}
                />
              ) : null}
            </SurfaceCard>
          ))}
        </View>
      </Card>

      <Card elevated>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pendientes de calificar</Text>
          <Chip
            label={`${reviewableAppointments.length} pendiente${reviewableAppointments.length === 1 ? '' : 's'}`}
            tone={reviewableAppointments.length ? 'warning' : 'neutral'}
          />
        </View>

        {!reviewableAppointments.length ? (
          <MutedText>No tienes citas pendientes de reseña.</MutedText>
        ) : null}

        <View style={styles.list}>
          {reviewableAppointments.map((item) => (
            <SurfaceCard key={item.id} style={styles.infoCard}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>{formatDateTime(item.start_at)}</Text>
              <Text style={[styles.infoMeta, { color: colors.textMuted }]}>
                {item.service_name || 'Servicio'} - {item.staff_name || 'Sin asignar'}
              </Text>
              <ActionButton
                label="Calificar cita"
                onPress={() =>
                  router.push({
                    pathname: '/cuenta/resenas/[appointmentId]',
                    params: { appointmentId: item.id },
                  })
                }
              />
            </SurfaceCard>
          ))}
        </View>
      </Card>

      <Card elevated>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Mis reservas</Text>
        {loading ? <MutedText>Cargando...</MutedText> : null}
        {!loading && !appointments.length ? (
          <MutedText>No encontramos reservas asociadas a tu cuenta.</MutedText>
        ) : null}

        <View style={styles.list}>
          {appointments.map((item) => (
            <SurfaceCard
              key={item.id}
              onPress={() => router.push(`/appointment/${item.id}`)}
              style={styles.infoCard}
            >
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                {formatDateTime(item.start_at)}
              </Text>
              <Text style={[styles.infoMeta, { color: colors.textMuted }]}>
                {item.service_name || 'Servicio'} - {item.staff_name || 'Sin asignar'}
              </Text>
              <Text style={[styles.infoMeta, { color: colors.textMuted }]}>
                Estado: {bookingStatusLabel[item.status] || item.status}
              </Text>
              {item.payment_status ? (
                <Text style={[styles.infoMeta, { color: colors.textMuted }]}>
                  {paymentStatusLabel[item.payment_status] || `Pago: ${item.payment_status}`}
                </Text>
              ) : null}
              {item.status === 'done' && !item.has_review ? (
                <Text style={[styles.infoHint, { color: colors.warning }]}>
                  Pendiente de calificar
                </Text>
              ) : null}
              {item.has_review ? (
                <Text style={[styles.infoHint, { color: colors.textMuted }]}>
                  Reseña enviada{item.review_rating ? `: ${item.review_rating} / 5` : ''}
                </Text>
              ) : null}
            </SurfaceCard>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  paymentMethodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileHeaderText: {
    flex: 1,
    gap: 3,
  },
  profileEmail: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Sora_700Bold',
  },
  subSectionTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  actions: {
    gap: 8,
  },
  list: {
    gap: 8,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 3,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  infoMeta: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  infoHint: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  inviteActions: {
    marginTop: 8,
    gap: 8,
  },
  success: {
    fontSize: 13,
  },
});
