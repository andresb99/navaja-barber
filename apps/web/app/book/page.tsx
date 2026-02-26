import { SHOP_ID } from '@/lib/constants';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { BookingFlow } from '@/components/public/booking-flow';

export default async function BookPage() {
  const supabase = createSupabaseAdminClient();

  const [{ data: services }, { data: staff }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, price_cents, duration_minutes')
      .eq('shop_id', SHOP_ID)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('staff')
      .select('id, name')
      .eq('shop_id', SHOP_ID)
      .eq('is_active', true)
      .order('name'),
  ]);

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-8">
        <div className="relative z-10">
          <p className="inline-flex rounded-full border border-slate/20 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/80 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            Reservas online
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.2rem] dark:text-slate-100">
            Agendar una cita
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
            Elegi un servicio, selecciona barbero, horario y confirma tus datos en un flujo de cuatro pasos.
          </p>
        </div>
      </div>

      <BookingFlow
        shopId={SHOP_ID}
        services={(services || []).map((item) => ({
          id: item.id as string,
          name: item.name as string,
          price_cents: item.price_cents as number,
          duration_minutes: item.duration_minutes as number,
        }))}
        staff={(staff || []).map((item) => ({
          id: item.id as string,
          name: item.name as string,
        }))}
      />
    </section>
  );
}

