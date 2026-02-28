import Link from 'next/link';
import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
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

export default async function CuentaPage() {
  const ctx = await requireAuthenticated('/cuenta');
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, phone, avatar_url')
    .eq('auth_user_id', ctx.userId as string)
    .maybeSingle();

  let resolvedProfile = profile;
  if (!resolvedProfile && ctx.userId) {
    await admin
      .from('user_profiles')
      .upsert(
        { auth_user_id: ctx.userId, full_name: null, phone: null, avatar_url: null },
        { onConflict: 'auth_user_id' },
      );
    resolvedProfile = { full_name: null, phone: null, avatar_url: null };
  }

  const appointments =
    ctx.role === 'user' && ctx.email ? await getAccountAppointments(ctx.email) : [];
  const reviewableAppointments = appointments.filter(
    (item) => item.status === 'done' && !item.hasReview,
  );
  const historyAppointments = appointments;

  return (
    <section className="space-y-6">
      <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
        <CardBody className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-ink dark:text-slate-100">Mi cuenta</h3>
              <p className="text-sm text-slate/80 dark:text-slate-300">
                Sesion activa y accesos segun tu rol.
              </p>
            </div>
            {ctx.role !== 'guest' ? (
              <Chip size="sm" radius="full" variant="flat" color="default">
                {roleLabel[ctx.role]}
              </Chip>
            ) : null}
          </div>

          <dl className="mt-4 grid gap-2 text-sm">
            <div className="surface-card">
              <dt className="font-medium text-slate/80">Email</dt>
              <dd className="mt-1">{ctx.email || 'No disponible'}</dd>
            </div>
            <div className="surface-card">
              <dt className="font-medium text-slate/80">Nombre</dt>
              <dd className="mt-1">{String(resolvedProfile?.full_name || 'No configurado')}</dd>
            </div>
            <div className="surface-card">
              <dt className="font-medium text-slate/80">Telefono</dt>
              <dd className="mt-1">{String(resolvedProfile?.phone || 'No configurado')}</dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              as="a"
              href="/book"
              variant="flat"
              color="default"
              className="action-secondary px-5 text-sm font-semibold"
            >
              Agendar cita
            </Button>
          </div>
        </CardBody>
      </Card>

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
            email={ctx.email || ''}
          />
        </CardBody>
      </Card>

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
              Para probar ese flujo, inicia sesion con un usuario normal cuyo email coincida con un
              cliente de la base.
            </p>
          </CardBody>
        </Card>
      )}
    </section>
  );
}
