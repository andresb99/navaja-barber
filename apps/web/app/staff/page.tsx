import { Card, CardBody } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { StaffAppointmentStatusForm } from '@/components/staff/appointment-status-form';
import { requireStaff } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const statusTone: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  confirmed: 'default',
  cancelled: 'danger',
  no_show: 'danger',
  done: 'success',
};

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  no_show: 'No asistio',
  done: 'Realizada',
};

export default async function StaffPage() {
  const ctx = await requireStaff();
  const supabase = await createSupabaseServerClient();

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, start_at, end_at, status, services(name), customers(name, phone), notes')
    .eq('staff_id', ctx.staffId)
    .gte('start_at', start.toISOString())
    .lt('start_at', end.toISOString())
    .order('start_at');

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-8">
        <div className="relative z-10">
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.1rem] dark:text-slate-100">
            Panel de staff
          </h1>
          <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
            Agenda de los proximos 7 dias para {ctx.email || 'tu cuenta'}.
          </p>
        </div>
      </div>

      <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
        <CardBody className="p-5">
          <h3 className="text-xl font-semibold text-ink dark:text-slate-100">Mis citas</h3>
          <p className="text-sm text-slate/80 dark:text-slate-300">
            Actualiza estado como realizada, no asistio o cancelada.
          </p>

          <div className="mt-4 space-y-3">
            {(appointments || []).length === 0 ? (
              <p className="text-sm text-slate/70">No hay citas en este periodo.</p>
            ) : null}

            {(appointments || []).map((item) => (
              <div key={String(item.id)} className="surface-card rounded-2xl p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-ink">
                    {new Date(String(item.start_at)).toLocaleString('es-UY')} -{' '}
                    {String((item.services as { name?: string } | null)?.name || 'Servicio')}
                  </p>
                  <Chip
                    size="sm"
                    radius="full"
                    variant="flat"
                    color={statusTone[String(item.status)] || 'default'}
                  >
                    {statusLabel[String(item.status)] || String(item.status)}
                  </Chip>
                </div>
                <p className="mt-1 text-xs text-slate/70">
                  Cliente:{' '}
                  {String((item.customers as { name?: string } | null)?.name || 'Sin nombre')} -{' '}
                  {String((item.customers as { phone?: string } | null)?.phone || 'Sin telefono')}
                </p>
                {item.notes ? (
                  <p className="mt-1 text-xs text-slate/70">Notas: {String(item.notes)}</p>
                ) : null}

                <StaffAppointmentStatusForm
                  appointmentId={String(item.id)}
                  status={String(item.status)}
                />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
