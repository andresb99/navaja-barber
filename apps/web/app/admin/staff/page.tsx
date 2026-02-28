import { Card, CardBody } from '@heroui/card';
import { AdminStaffForms } from '@/components/admin/staff-forms';
import { SHOP_ID } from '@/lib/constants';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return 'ST';
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
}

export default async function StaffPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: staff }, { data: workingHours }, { data: timeOff }] = await Promise.all([
    supabase
      .from('staff')
      .select('id, name, role, phone, is_active')
      .eq('shop_id', SHOP_ID)
      .order('name'),
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

  const activeStaffCount = (staff || []).filter((item) => item.is_active).length;
  const groupedWorkingHours = new Map<
    string,
    {
      staffName: string;
      items: Array<{
        id: string;
        dayLabel: string;
        startTime: string;
        endTime: string;
      }>;
    }
  >();

  for (const entry of workingHours || []) {
    const staffName = String((entry.staff as { name?: string } | null)?.name || 'Personal');

    if (!groupedWorkingHours.has(staffName)) {
      groupedWorkingHours.set(staffName, {
        staffName,
        items: [],
      });
    }

    groupedWorkingHours.get(staffName)?.items.push({
      id: String(entry.id),
      dayLabel: weekdays[Number(entry.day_of_week || 0)] || 'Dia',
      startTime: String(entry.start_time),
      endTime: String(entry.end_time),
    });
  }

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Equipo</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.3rem] dark:text-slate-100">
              Gestion de personal y disponibilidad
            </h1>
            <p className="mt-3 text-sm text-slate/80 dark:text-slate-300">
              El equipo ahora se ordena por identidad, disponibilidad y bloqueos; menos bloques
              repetidos, mas lectura por persona.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Equipo
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {(staff || []).length}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Activos
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {activeStaffCount}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Bloqueos
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {(timeOff || []).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <AdminStaffForms
        shopId={SHOP_ID}
        weekdays={weekdays}
        staff={(staff || []).map((item) => ({
          id: String(item.id),
          name: String(item.name),
        }))}
      />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="spotlight-card soft-panel rounded-[1.9rem] border-0 shadow-none">
          <CardBody className="p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-ink dark:text-slate-100">Equipo</h3>
                <p className="text-sm text-slate/80 dark:text-slate-300">
                  Vista rapida de roles y estado.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {(staff || []).map((item) => (
                <div key={String(item.id)} className="data-card rounded-[1.4rem] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-white/55 text-sm font-semibold text-ink dark:border-transparent dark:bg-white/[0.05] dark:text-slate-100">
                        {getInitials(String(item.name))}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-ink dark:text-slate-100">
                          {String(item.name)}
                        </p>
                        <p className="mt-1 text-sm text-slate/75 dark:text-slate-300">
                          {String(item.phone)}
                        </p>
                      </div>
                    </div>
                    <span className="meta-chip" data-tone={item.is_active ? 'success' : undefined}>
                      {item.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="mt-4 border-t border-white/45 pt-3 dark:border-transparent">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                      {String(item.role)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card className="spotlight-card soft-panel rounded-[1.9rem] border-0 shadow-none">
          <CardBody className="p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
                  Horarios configurados
                </h3>
                <p className="text-sm text-slate/80 dark:text-slate-300">
                  Agrupados por persona para leerlos de una vez.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {Array.from(groupedWorkingHours.values()).map((group) => (
                <div key={group.staffName} className="data-card rounded-[1.5rem] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-white/55 text-sm font-semibold text-ink dark:border-transparent dark:bg-white/[0.05] dark:text-slate-100">
                      {getInitials(group.staffName)}
                    </div>
                    <p className="text-base font-semibold text-ink dark:text-slate-100">
                      {group.staffName}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.items.map((entry) => (
                      <span
                        key={entry.id}
                        className="rounded-full border border-white/55 bg-white/45 px-3 py-1.5 text-[11px] font-semibold text-slate/80 dark:border-transparent dark:bg-white/[0.04] dark:text-slate-300"
                      >
                        {entry.dayLabel.slice(0, 3)} {entry.startTime}-{entry.endTime}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="spotlight-card soft-panel rounded-[1.9rem] border-0 shadow-none">
        <CardBody className="p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
                Bloqueos recientes
              </h3>
              <p className="text-sm text-slate/80 dark:text-slate-300">
                Historial compacto de indisponibilidad.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(timeOff || []).map((item) => (
              <div key={String(item.id)} className="data-card rounded-[1.5rem] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-ink dark:text-slate-100">
                      {String((item.staff as { name?: string } | null)?.name || 'Personal')}
                    </p>
                    <p className="mt-2 text-sm text-slate/75 dark:text-slate-300">
                      {new Date(String(item.start_at)).toLocaleString('es-UY')}
                    </p>
                    <p className="text-sm text-slate/75 dark:text-slate-300">
                      {new Date(String(item.end_at)).toLocaleString('es-UY')}
                    </p>
                  </div>
                  <span className="meta-chip" data-tone="danger">
                    Bloqueado
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate/75 dark:text-slate-300">
                  {String(item.reason || 'Sin motivo')}
                </p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
