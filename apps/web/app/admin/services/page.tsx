import { formatCurrency } from '@navaja/shared';
import { SHOP_ID } from '@/lib/constants';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { upsertServiceAction } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default async function ServicesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: services } = await supabase
    .from('services')
    .select('id, name, price_cents, duration_minutes, is_active')
    .eq('shop_id', SHOP_ID)
    .order('name');

  return (
    <section className="space-y-6">
      <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink">Servicios</h1>

      <Card>
        <CardTitle>Agregar servicio</CardTitle>
        <CardDescription>Configura opciones para reserva publica.</CardDescription>
        <form action={upsertServiceAction} className="mt-4 grid gap-3 md:grid-cols-4">
          <input type="hidden" name="shop_id" value={SHOP_ID} />
          <Input name="name" placeholder="Nombre del servicio" required />
          <Input name="price_cents" type="number" placeholder="Precio en cents" required />
          <Input name="duration_minutes" type="number" placeholder="Duracion en minutos" required />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked /> Activo
          </label>
          <div className="md:col-span-4">
            <Button type="submit">Guardar servicio</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle>Servicios actuales</CardTitle>
        <ul className="mt-3 space-y-2 text-sm">
          {(services || []).map((item) => (
            <li key={String(item.id)} className="rounded-md bg-slate/5 p-3">
              <p className="font-medium text-ink">{String(item.name)}</p>
              <p className="text-xs text-slate/70">
                {formatCurrency(Number(item.price_cents || 0))} - {String(item.duration_minutes)} min -{' '}
                {item.is_active ? 'Activo' : 'Inactivo'}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
