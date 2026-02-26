import { formatCurrency } from '@navaja/shared';
import { SHOP_ID } from '@/lib/constants';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { updateAppointmentStatusAction } from '@/app/admin/actions';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, Td, Th } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface AppointmentsPageProps {
  searchParams: Promise<{ from?: string; to?: string; staff_id?: string; status?: string }>;
}

const statusTone: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  confirmed: 'neutral',
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

export default async function AppointmentsPage({ searchParams }: AppointmentsPageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  const from = params.from || new Date().toISOString().slice(0, 10);
  const to = params.to || from;

  const [{ data: staff }, appointmentsResult] = await Promise.all([
    supabase.from('staff').select('id, name').eq('shop_id', SHOP_ID).eq('is_active', true).order('name'),
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

  if (params.staff_id) {
    appointments = appointments.filter((item) => String(item.staff_id || '') === params.staff_id);
  }

  if (params.status) {
    appointments = appointments.filter((item) => item.status === params.status);
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink">Citas</h1>
        <p className="mt-1 text-sm text-slate/80">Filtra reservas y actualiza estados.</p>
      </div>

      <form className="soft-panel grid gap-3 rounded-2xl border border-white/45 p-4 md:grid-cols-5 dark:border-slate-700" method="get">
        <div>
          <label htmlFor="from">Desde</label>
          <Input id="from" name="from" type="date" defaultValue={from} />
        </div>
        <div>
          <label htmlFor="to">Hasta</label>
          <Input id="to" name="to" type="date" defaultValue={to} />
        </div>
        <div>
          <label htmlFor="staff">Equipo</label>
          <Select id="staff" name="staff_id" defaultValue={params.staff_id || ''}>
            <option value="">Todo el equipo</option>
            {(staff || []).map((item) => (
              <option key={String(item.id)} value={String(item.id)}>
                {String(item.name)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="status">Estado</label>
          <Select id="status" name="status" defaultValue={params.status || ''}>
            <option value="">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="confirmed">Confirmada</option>
            <option value="cancelled">Cancelada</option>
            <option value="no_show">No asistio</option>
            <option value="done">Realizada</option>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full">
            Aplicar filtros
          </Button>
        </div>
      </form>

      <div className="overflow-auto rounded-2xl border border-slate/20 bg-white/85 dark:border-slate-700 dark:bg-slate-900/75">
        <Table>
          <thead>
            <tr>
              <Th>Inicio</Th>
              <Th>Cliente</Th>
              <Th>Servicio</Th>
              <Th>Barbero</Th>
              <Th>Estado</Th>
              <Th>Precio</Th>
              <Th>Actualizar</Th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((item) => (
              <tr key={String(item.id)}>
                <Td>{new Date(String(item.start_at)).toLocaleString('es-UY')}</Td>
                <Td>
                  <p>{String((item.customers as { name?: string } | null)?.name || 'Sin nombre')}</p>
                  <p className="text-xs text-slate/70">{String((item.customers as { phone?: string } | null)?.phone || '')}</p>
                </Td>
                <Td>{String((item.services as { name?: string } | null)?.name || 'Servicio')}</Td>
                <Td>{String((item.staff as { name?: string } | null)?.name || 'Barbero')}</Td>
                <Td>
                  <Badge tone={statusTone[String(item.status)] || 'neutral'}>
                    {statusLabel[String(item.status)] || String(item.status)}
                  </Badge>
                </Td>
                <Td>{formatCurrency(Number(item.price_cents || 0))}</Td>
                <Td>
                  <form action={updateAppointmentStatusAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="appointment_id" value={String(item.id)} />
                    <Select name="status" defaultValue={String(item.status)} className="w-40">
                      <option value="confirmed">Confirmada</option>
                      <option value="cancelled">Cancelada</option>
                      <option value="no_show">No asistio</option>
                      <option value="done">Realizada</option>
                    </Select>
                    <Input name="price_cents" placeholder="Precio en cents" className="w-32" />
                    <Button type="submit" variant="secondary">
                      Guardar
                    </Button>
                  </form>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </section>
  );
}
