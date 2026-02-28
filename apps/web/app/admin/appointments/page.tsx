import { formatCurrency } from '@navaja/shared';
import { AdminAppointmentsFilters } from '@/components/admin/appointments-filters';
import { AdminAppointmentsTable } from '@/components/admin/appointments-table';
import { SHOP_ID } from '@/lib/constants';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface AppointmentsPageProps {
  searchParams: Promise<{ from?: string; to?: string; staff_id?: string; status?: string }>;
}

function formatDateInput(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value || '1970';
  const month = parts.find((part) => part.type === 'month')?.value || '01';
  const day = parts.find((part) => part.type === 'day')?.value || '01';

  return `${year}-${month}-${day}`;
}

export default async function AppointmentsPage({ searchParams }: AppointmentsPageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: shop } = await supabase
    .from('shops')
    .select('timezone')
    .eq('id', SHOP_ID)
    .maybeSingle();
  const shopTimeZone = String(shop?.timezone || 'UTC');

  const now = new Date();
  const defaultFrom = formatDateInput(now, shopTimeZone);
  const defaultToDate = new Date(now);
  defaultToDate.setDate(defaultToDate.getDate() + 28);
  const defaultTo = formatDateInput(defaultToDate, shopTimeZone);

  const selectedStaffId =
    params.staff_id && params.staff_id !== 'all' ? params.staff_id : undefined;
  const selectedStatus = params.status && params.status !== 'all' ? params.status : undefined;
  const from = params.from || defaultFrom;
  const to = params.to || (params.from ? params.from : defaultTo);

  const [{ data: staff }, appointmentsResult] = await Promise.all([
    supabase
      .from('staff')
      .select('id, name')
      .eq('shop_id', SHOP_ID)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('appointments')
      .select(
        'id, staff_id, start_at, end_at, status, price_cents, notes, customers(name, phone), services(name), staff(name)',
      )
      .eq('shop_id', SHOP_ID)
      .gte('start_at', `${from}T00:00:00.000Z`)
      .lte('start_at', `${to}T23:59:59.999Z`)
      .order('start_at'),
  ]);

  let appointments = appointmentsResult.data || [];

  if (selectedStaffId) {
    appointments = appointments.filter((item) => String(item.staff_id || '') === selectedStaffId);
  }

  if (selectedStatus) {
    appointments = appointments.filter((item) => item.status === selectedStatus);
  }

  const pendingCount = appointments.filter((item) => item.status === 'pending').length;
  const doneCount = appointments.filter((item) => item.status === 'done').length;

  return (
    <section className="space-y-5">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Citas</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.3rem] dark:text-slate-100">
              Control de reservas y estados
            </h1>
            <p className="mt-3 text-sm text-slate/80 dark:text-slate-300">
              Filtra reservas y actualiza estados. Por defecto se muestran las proximas 4 semanas.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Total
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {appointments.length}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Pendientes
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {pendingCount}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Realizadas
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {doneCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      <AdminAppointmentsFilters
        from={from}
        to={to}
        selectedStaffId={selectedStaffId}
        selectedStatus={selectedStatus}
        staff={(staff || []).map((item) => ({
          id: String(item.id),
          name: String(item.name),
        }))}
      />

      <AdminAppointmentsTable
        appointments={appointments.map((item) => ({
          id: String(item.id),
          startAtLabel: new Date(String(item.start_at)).toLocaleString('es-UY', {
            timeZone: shopTimeZone,
          }),
          customerName: String((item.customers as { name?: string } | null)?.name || 'Sin nombre'),
          customerPhone: String((item.customers as { phone?: string } | null)?.phone || ''),
          serviceName: String((item.services as { name?: string } | null)?.name || 'Servicio'),
          staffName: String((item.staff as { name?: string } | null)?.name || 'Barbero'),
          status: String(item.status),
          priceLabel: formatCurrency(Number(item.price_cents || 0)),
        }))}
      />
    </section>
  );
}
