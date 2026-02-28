import { formatCurrency } from '@navaja/shared';
import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
import { Input } from '@heroui/input';
import { SHOP_ID } from '@/lib/constants';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { upsertServiceAction } from '@/app/admin/actions';

export default async function ServicesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: services } = await supabase
    .from('services')
    .select('id, name, price_cents, duration_minutes, is_active')
    .eq('shop_id', SHOP_ID)
    .order('name');

  const activeServices = (services || []).filter((item) => item.is_active).length;

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Servicios</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.3rem] dark:text-slate-100">
              Catalogo publico y configuracion
            </h1>
            <p className="mt-3 text-sm text-slate/80 dark:text-slate-300">
              Servicios convertidos en un catalogo mas claro: precio visible, estado evidente y
              menos bloques planos.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Total
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {(services || []).length}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Activos
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {activeServices}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Inactivos
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {(services || []).length - activeServices}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card className="spotlight-card soft-panel rounded-[1.8rem] border-0 shadow-none">
        <CardBody className="p-5">
          <h3 className="text-xl font-semibold text-ink dark:text-slate-100">Agregar servicio</h3>
          <p className="text-sm text-slate/80 dark:text-slate-300">
            Configura opciones para reserva publica.
          </p>
          <form action={upsertServiceAction} className="mt-4 grid gap-3 md:grid-cols-4">
            <input type="hidden" name="shop_id" value={SHOP_ID} />
            <Input name="name" label="Nombre del servicio" labelPlacement="inside" required />
            <Input
              name="price_cents"
              type="number"
              label="Precio en cents"
              labelPlacement="inside"
              required
            />
            <Input
              name="duration_minutes"
              type="number"
              label="Duracion en minutos"
              labelPlacement="inside"
              required
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_active" defaultChecked /> Activo
            </label>
            <div className="md:col-span-4">
              <Button type="submit" className="action-primary px-5 text-sm font-semibold">
                Guardar servicio
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card className="spotlight-card soft-panel rounded-[1.8rem] border-0 shadow-none">
        <CardBody className="p-5">
          <h3 className="text-xl font-semibold text-ink dark:text-slate-100">Servicios actuales</h3>
          {(services || []).length === 0 ? (
            <p className="mt-3 text-sm text-slate/80 dark:text-slate-300">
              No hay servicios creados todavia.
            </p>
          ) : null}

          <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(services || []).map((item) => (
              <li key={String(item.id)} className="data-card rounded-[1.55rem] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                      Servicio
                    </p>
                    <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                      {String(item.name)}
                    </p>
                  </div>
                  <span className="meta-chip" data-tone={item.is_active ? 'success' : undefined}>
                    {item.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="mt-5 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                      Precio
                    </p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-ink dark:text-slate-100">
                      {formatCurrency(Number(item.price_cents || 0))}
                    </p>
                  </div>
                  <div className="rounded-full border border-white/55 bg-white/42 px-3 py-1.5 text-xs font-semibold text-slate/80 dark:border-transparent dark:bg-white/[0.04] dark:text-slate-300">
                    {String(item.duration_minutes)} min
                  </div>
                </div>

                <div className="mt-4 border-t border-white/45 pt-3 dark:border-transparent">
                  <p className="text-xs text-slate/70 dark:text-slate-400">
                    {item.is_active
                      ? 'Visible en reservas publicas.'
                      : 'Oculto del flujo de reserva.'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </section>
  );
}
