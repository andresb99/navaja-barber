import { SHOP_ID } from '@/lib/constants';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BookingFlow } from '@/components/public/booking-flow';

export default async function BookPage() {
  const sessionSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionSupabase.auth.getUser();
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
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Reservas online</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.4rem] dark:text-slate-100">
              Agenda una cita con una experiencia mas directa
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
              El flujo prioriza claridad: servicio, barbero, horario y datos en una sola secuencia
              visual, sin pasos innecesarios.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Paso 1
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">Servicio</p>
              <p className="mt-1 text-xs text-slate/75 dark:text-slate-400">
                Precio y duracion visibles.
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Paso 2
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">Horario</p>
              <p className="mt-1 text-xs text-slate/75 dark:text-slate-400">Slots de 15 minutos.</p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Paso 3
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                Confirmacion
              </p>
              <p className="mt-1 text-xs text-slate/75 dark:text-slate-400">
                Contacto rapido por WhatsApp o email.
              </p>
            </div>
          </div>
        </div>
      </div>

      <BookingFlow
        shopId={SHOP_ID}
        initialCustomerEmail={user?.email || ''}
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
