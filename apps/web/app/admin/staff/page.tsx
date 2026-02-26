import { SHOP_ID } from '@/lib/constants';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createTimeOffAction, upsertStaffAction, upsertWorkingHoursAction } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

export default async function StaffPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: staff }, { data: workingHours }, { data: timeOff }] = await Promise.all([
    supabase.from('staff').select('id, name, role, phone, is_active').eq('shop_id', SHOP_ID).order('name'),
    supabase
      .from('working_hours')
      .select('id, staff_id, day_of_week, start_time, end_time, staff(name)')
      .eq('shop_id', SHOP_ID)
      .order('day_of_week'),
    supabase
      .from('time_off')
      .select('id, staff_id, start_at, end_at, reason, staff(name)')
      .eq('shop_id', SHOP_ID)
      .order('start_at', { ascending: false })
      .limit(20),
  ]);

  return (
    <section className="space-y-6">
      <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink">Equipo</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Alta o edicion de personal</CardTitle>
          <CardDescription>Crea integrantes y asigna su rol.</CardDescription>
          <form action={upsertStaffAction} className="mt-4 grid gap-3">
            <input type="hidden" name="shop_id" value={SHOP_ID} />
            <Input name="name" placeholder="Nombre" required />
            <Input name="phone" placeholder="Telefono" required />
            <Input name="auth_user_id" placeholder="ID de usuario en Supabase (opcional)" />
            <Select name="role" defaultValue="staff">
              <option value="staff">Personal</option>
              <option value="admin">Administrador</option>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_active" defaultChecked /> Activo
            </label>
            <Button type="submit">Guardar personal</Button>
          </form>
        </Card>

        <Card>
          <CardTitle>Horarios laborales</CardTitle>
          <CardDescription>Base de disponibilidad para generar turnos.</CardDescription>
          <form action={upsertWorkingHoursAction} className="mt-4 grid gap-3">
            <input type="hidden" name="shop_id" value={SHOP_ID} />
            <Select name="staff_id" required>
              <option value="">Selecciona personal</option>
              {(staff || []).map((item) => (
                <option key={String(item.id)} value={String(item.id)}>
                  {String(item.name)}
                </option>
              ))}
            </Select>
            <Select name="day_of_week" defaultValue="1">
              {weekdays.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input name="start_time" type="time" defaultValue="09:00" required />
              <Input name="end_time" type="time" defaultValue="17:00" required />
            </div>
            <Button type="submit">Guardar horario</Button>
          </form>
        </Card>
      </div>

      <Card>
        <CardTitle>Agregar tiempo no disponible</CardTitle>
        <CardDescription>Excluye periodos de la disponibilidad reservable.</CardDescription>
        <form action={createTimeOffAction} className="mt-4 grid gap-3 md:grid-cols-4">
          <input type="hidden" name="shop_id" value={SHOP_ID} />
          <Select name="staff_id" required>
            <option value="">Selecciona personal</option>
            {(staff || []).map((item) => (
              <option key={String(item.id)} value={String(item.id)}>
                {String(item.name)}
              </option>
            ))}
          </Select>
          <Input name="start_at" type="datetime-local" required />
          <Input name="end_at" type="datetime-local" required />
          <Input name="reason" placeholder="Motivo" />
          <div className="md:col-span-4">
            <Button type="submit">Agregar bloqueo</Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>Equipo</CardTitle>
          <ul className="mt-3 space-y-2 text-sm">
            {(staff || []).map((item) => (
              <li key={String(item.id)} className="rounded-md bg-slate/5 p-2">
                <p className="font-medium text-ink">{String(item.name)}</p>
                <p className="text-xs text-slate/70">
                  {String(item.role)} - {String(item.phone)} - {item.is_active ? 'Activo' : 'Inactivo'}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>Horarios configurados</CardTitle>
          <ul className="mt-3 space-y-2 text-sm">
            {(workingHours || []).map((item) => (
              <li key={String(item.id)} className="rounded-md bg-slate/5 p-2">
                <p className="font-medium text-ink">{String((item.staff as { name?: string } | null)?.name || 'Personal')}</p>
                <p className="text-xs text-slate/70">
                  {weekdays[Number(item.day_of_week || 0)]} - {String(item.start_time)} a {String(item.end_time)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardTitle>Bloqueos recientes</CardTitle>
        <ul className="mt-3 space-y-2 text-sm">
          {(timeOff || []).map((item) => (
            <li key={String(item.id)} className="rounded-md bg-slate/5 p-3">
              <p className="font-medium text-ink">{String((item.staff as { name?: string } | null)?.name || 'Personal')}</p>
              <p className="text-xs text-slate/70">
                {new Date(String(item.start_at)).toLocaleString('es-UY')} - {new Date(String(item.end_at)).toLocaleString('es-UY')}
              </p>
              <p className="text-xs text-slate/70">{String(item.reason || 'Sin motivo')}</p>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
