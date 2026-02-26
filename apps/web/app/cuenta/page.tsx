import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { requireAuthenticated } from '@/lib/auth';
import { SHOP_ID } from '@/lib/constants';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  no_show: 'No asistio',
  done: 'Realizada',
};

const roleLabel: Record<'user' | 'staff' | 'admin', string> = {
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
    .select('full_name, phone')
    .eq('auth_user_id', ctx.userId as string)
    .maybeSingle();

  let resolvedProfile = profile;
  if (!resolvedProfile && ctx.userId) {
    await admin
      .from('user_profiles')
      .upsert({ auth_user_id: ctx.userId, full_name: null, phone: null }, { onConflict: 'auth_user_id' });
    resolvedProfile = { full_name: null, phone: null };
  }

  const appointments =
    ctx.role === 'user' && ctx.email
      ? (
          await admin
            .from('appointments')
            .select('id, start_at, status, services(name), staff(name), customers!inner(email)')
            .eq('shop_id', SHOP_ID)
            .eq('customers.email', ctx.email)
            .order('start_at', { ascending: false })
            .limit(30)
        ).data || []
      : [];

  return (
    <section className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Mi cuenta</CardTitle>
            <CardDescription>Sesion activa y accesos segun tu rol.</CardDescription>
          </div>
          {ctx.role !== 'guest' ? <Badge tone="neutral">{roleLabel[ctx.role]}</Badge> : null}
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
          <Button asChild variant="secondary">
            <Link href="/book" className="no-underline">
              Agendar cita
            </Link>
          </Button>
          {ctx.role === 'admin' ? (
            <Button asChild>
              <Link href="/admin" className="no-underline">
                Ir al panel admin
              </Link>
            </Button>
          ) : null}
          {ctx.role === 'staff' ? (
            <Button asChild>
              <Link href="/staff" className="no-underline">
                Ir al panel staff
              </Link>
            </Button>
          ) : null}
        </div>
      </Card>

      {ctx.role === 'user' ? (
        <Card>
          <CardTitle>Mis reservas</CardTitle>
          <CardDescription>Reservas asociadas a tu email.</CardDescription>

          <div className="mt-4 space-y-2">
            {appointments.length === 0 ? <p className="text-sm text-slate/70">No encontramos reservas para tu cuenta.</p> : null}
            {appointments.map((item) => (
              <div
                key={String(item.id)}
                className="rounded-xl border border-slate/20 bg-white/75 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/70"
              >
                <p className="font-medium text-ink">
                  {new Date(String(item.start_at)).toLocaleString('es-UY')} -{' '}
                  {String((item.services as { name?: string } | null)?.name || 'Servicio')}
                </p>
                <p className="mt-1 text-xs text-slate/70">
                  Barbero: {String((item.staff as { name?: string } | null)?.name || 'Sin asignar')}
                </p>
                <p className="mt-1 text-xs text-slate/70">
                  Estado: {statusLabel[String(item.status)] || String(item.status)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </section>
  );
}
