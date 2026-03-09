import Link from 'next/link';
import { Card, CardBody } from '@heroui/card';
import { AccountNotificationsPanel } from '@/components/public/account-notifications-panel';
import { Chip } from '@heroui/chip';
import { AccountProfileForm } from '@/components/public/account-profile-form';
import { getAccountAppointments } from '@/lib/account-reviews';
import { requireAuthenticated } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  no_show: 'No asistio',
  done: 'Realizada',
};

const roleLabel: Record<'guest' | 'user' | 'staff' | 'admin', string> = {
  guest: 'Invitado',
  user: 'Usuario',
  staff: 'Staff',
  admin: 'Administrador',
};

function resolvePreferredPaymentMethod(value: unknown): 'mercado_pago' | 'card' | 'cash' | '' {
  const normalized = String(value || '').trim();
  if (normalized === 'mercado_pago' || normalized === 'card' || normalized === 'cash') {
    return normalized;
  }

  return '';
}

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

export default async function CuentaPage() {
  const ctx = await requireAuthenticated('/cuenta');
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const metadata = (user?.user_metadata as Record<string, unknown> | undefined) ?? undefined;
  const metadataFullName =
    (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) ||
    (typeof metadata?.name === 'string' && metadata.name.trim()) ||
    null;
  const metadataAvatarUrl =
    (typeof metadata?.avatar_url === 'string' && metadata.avatar_url.trim()) ||
    (typeof metadata?.picture === 'string' && metadata.picture.trim()) ||
    null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select(
      'full_name, phone, avatar_url, preferred_payment_method, preferred_card_brand, preferred_card_last4',
    )
    .eq('auth_user_id', ctx.userId as string)
    .maybeSingle();

  const savedFullName =
    (typeof profile?.full_name === 'string' && profile.full_name.trim()) || null;
  const savedPhone = (typeof profile?.phone === 'string' && profile.phone.trim()) || null;
  const savedAvatarUrl =
    (typeof profile?.avatar_url === 'string' && profile.avatar_url.trim()) || null;
  const savedPreferredPaymentMethod =
    (typeof profile?.preferred_payment_method === 'string' &&
      profile.preferred_payment_method.trim()) ||
    null;
  const savedPreferredCardBrand =
    (typeof profile?.preferred_card_brand === 'string' && profile.preferred_card_brand.trim()) ||
    null;
  const savedPreferredCardLast4 =
    (typeof profile?.preferred_card_last4 === 'string' && profile.preferred_card_last4.trim()) ||
    null;

  let resolvedProfile = {
    full_name: savedFullName || metadataFullName,
    phone: savedPhone,
    avatar_url: savedAvatarUrl || metadataAvatarUrl,
    preferred_payment_method: savedPreferredPaymentMethod,
    preferred_card_brand: savedPreferredCardBrand,
    preferred_card_last4: savedPreferredCardLast4,
  };

  const shouldSyncProfile =
    Boolean(ctx.userId) &&
    (!profile || (!savedFullName && metadataFullName) || (!savedAvatarUrl && metadataAvatarUrl));

  if (shouldSyncProfile && ctx.userId) {
    await admin
      .from('user_profiles')
      .upsert(
        {
          auth_user_id: ctx.userId,
          full_name: resolvedProfile.full_name,
          phone: resolvedProfile.phone,
          avatar_url: resolvedProfile.avatar_url,
          preferred_payment_method: resolvedProfile.preferred_payment_method,
          preferred_card_brand: resolvedProfile.preferred_card_brand,
          preferred_card_last4: resolvedProfile.preferred_card_last4,
        },
        { onConflict: 'auth_user_id' },
      );
  }

  const { data: inviteMemberships } = ctx.userId
    ? await supabase
        .from('shop_memberships')
        .select('id, shop_id, role, membership_status, created_at')
        .eq('user_id', ctx.userId)
        .eq('membership_status', 'invited')
        .order('created_at', { ascending: false })
    : { data: [] as Array<{ id: string; shop_id: string; role: string; membership_status: string; created_at: string }> };
  const inviteShopIds = Array.from(
    new Set(
      (inviteMemberships || [])
        .map((item) => String(item.shop_id || ''))
        .filter(Boolean),
    ),
  );
  const { data: inviteShops } = inviteShopIds.length
    ? await admin.from('shops').select('id, name, slug').in('id', inviteShopIds)
    : { data: [] as Array<{ id: string; name: string; slug: string }> };
  const inviteShopsById = new Map(
    (inviteShops || []).map((item) => [
      String(item.id),
      {
        name: String(item.name),
        slug: String(item.slug),
      },
    ]),
  );
  const invitationItems = (inviteMemberships || []).map((item) => {
    const shop = inviteShopsById.get(String(item.shop_id || ''));

    return {
      id: String(item.id),
      role: String(item.role),
      createdAt: String(item.created_at),
      shopName: shop?.name || 'Barberia',
      shopSlug: shop?.slug || null,
    };
  });

  const { data: accountNotificationsRows, error: accountNotificationsError } = ctx.userId
    ? await supabase
        .from('account_notifications')
        .select('id, notification_type, title, message, action_url, is_read, created_at')
        .eq('user_id', ctx.userId)
        .order('created_at', { ascending: false })
        .limit(40)
    : {
        data: [] as Array<{
          id: string;
          notification_type: string;
          title: string;
          message: string;
          action_url: string | null;
          is_read: boolean;
          created_at: string;
        }>,
        error: null,
      };

  const accountNotifications = !accountNotificationsError
    ? (accountNotificationsRows || []).map((item) => ({
        id: String(item.id),
        type: String(item.notification_type || 'info'),
        title: String(item.title || 'Notificacion'),
        message: String(item.message || ''),
        actionUrl:
          typeof item.action_url === 'string' && item.action_url.trim()
            ? String(item.action_url)
            : null,
        isRead: Boolean(item.is_read),
        createdAt: String(item.created_at),
      }))
    : [];

  if (accountNotificationsError && !isMissingAccountNotificationsTableError(accountNotificationsError)) {
    throw new Error(accountNotificationsError.message);
  }

  const appointments =
    ctx.role === 'user' && ctx.userId ? await getAccountAppointments(ctx.userId) : [];
  const reviewableAppointments = appointments.filter(
    (item) => item.status === 'done' && !item.hasReview,
  );
  const historyAppointments = appointments;

  return (
    <section className="space-y-6">
      <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
        <CardBody className="space-y-4 p-5">
          <div>
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">Mi perfil</h3>
            <p className="text-sm text-slate/80 dark:text-slate-300">
              Actualiza tu nombre, telefono y la imagen que se usa en el avatar del menu.
            </p>
          </div>

          <AccountProfileForm
            initialFullName={String(resolvedProfile?.full_name || '')}
            initialPhone={String(resolvedProfile?.phone || '')}
            initialAvatarUrl={String(
              (resolvedProfile as { avatar_url?: string | null } | null)?.avatar_url || '',
            )}
            initialPreferredPaymentMethod={resolvePreferredPaymentMethod(
              (resolvedProfile as { preferred_payment_method?: string | null } | null)
                ?.preferred_payment_method,
            )}
            initialPreferredCardBrand={String(
              (resolvedProfile as { preferred_card_brand?: string | null } | null)
                ?.preferred_card_brand || '',
            )}
            initialPreferredCardLast4={String(
              (resolvedProfile as { preferred_card_last4?: string | null } | null)
                ?.preferred_card_last4 || '',
            )}
            email={ctx.email || ''}
          />
        </CardBody>
      </Card>

      <AccountNotificationsPanel
        invitations={invitationItems}
        notifications={accountNotifications}
      />

      {ctx.role === 'user' ? (
        <>
          {reviewableAppointments.length > 0 ? (
            <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
              <CardBody className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
                      Pendientes de calificar
                    </h3>
                    <p className="text-sm text-slate/80 dark:text-slate-300">
                      Tienes {reviewableAppointments.length} cita
                      {reviewableAppointments.length === 1 ? '' : 's'} sin calificar.
                    </p>
                  </div>
                  <Chip size="sm" radius="full" variant="flat" color="warning">
                    {reviewableAppointments.length} pendiente
                    {reviewableAppointments.length === 1 ? '' : 's'}
                  </Chip>
                </div>

                <div className="space-y-3">
                  {reviewableAppointments.map((item) => (
                    <div key={item.id} className="surface-card rounded-2xl p-4 text-sm">
                      <p className="font-medium text-ink dark:text-slate-100">
                        {new Date(item.startAt).toLocaleString('es-UY', { timeZone: 'UTC' })} -{' '}
                        {item.serviceName}
                      </p>
                      <p className="mt-1 text-xs text-slate/70">Barbero: {item.staffName}</p>
                      <div className="mt-3">
                        <Link
                          href={`/cuenta/resenas/${item.id}`}
                          className="font-medium text-ink underline"
                        >
                          Calificar cita
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          ) : null}

          <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
            <CardBody className="p-5">
              <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
                Historial de reservas
              </h3>
              <p className="text-sm text-slate/80 dark:text-slate-300">
                Tus reservas y resenas asociadas.
              </p>

              <div className="mt-4 space-y-2">
                {appointments.length === 0 ? (
                  <p className="text-sm text-slate/70">No encontramos reservas para tu cuenta.</p>
                ) : null}

                {historyAppointments.map((item) => (
                  <div key={item.id} className="surface-card rounded-2xl p-3 text-sm">
                    <p className="font-medium text-ink dark:text-slate-100">
                      {new Date(item.startAt).toLocaleString('es-UY', { timeZone: 'UTC' })} -{' '}
                      {item.serviceName}
                    </p>
                    <p className="mt-1 text-xs text-slate/70">Barbero: {item.staffName}</p>
                    <p className="mt-1 text-xs text-slate/70">
                      Estado: {statusLabel[item.status] || item.status}
                    </p>
                    {item.status === 'done' && !item.hasReview ? (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        Pendiente de calificar
                      </p>
                    ) : null}
                    {item.hasReview ? (
                      <p className="mt-1 text-xs text-slate/70">
                        Resena enviada{item.reviewRating ? `: ${item.reviewRating} / 5` : ''}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </>
      ) : (
        <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
          <CardBody className="space-y-2 p-5">
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
              Historial de reservas
            </h3>
            <p className="text-sm text-slate/80 dark:text-slate-300">
              Esta cuenta tiene rol {roleLabel[ctx.role]}. El historial y las resenas solo se
              muestran para cuentas de cliente.
            </p>
            <p className="text-xs text-slate/70 dark:text-slate-400">
              Para probar ese flujo, inicia sesion con un usuario normal vinculado a un cliente de
              la base.
            </p>
          </CardBody>
        </Card>
      )}
    </section>
  );
}
