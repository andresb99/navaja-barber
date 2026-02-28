import { formatCurrency } from '@navaja/shared';
import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
import { SHOP_ID } from '@/lib/constants';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export default async function CoursesPage() {
  const supabase = createSupabaseAdminClient();

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, description, price_cents, duration_hours, level')
    .eq('shop_id', SHOP_ID)
    .eq('is_active', true)
    .order('title');

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Academia Navaja</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.35rem] dark:text-slate-100">
              Cursos de barberia con una presentacion mas premium
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
              Encontraras formaciones activas, detalles de nivel y una inscripcion mas ordenada por
              sesion.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Oferta
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {(courses || []).length}
              </p>
              <p className="mt-1 text-xs text-slate/75 dark:text-slate-400">
                Cursos visibles ahora.
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Formato
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">Sesiones</p>
              <p className="mt-1 text-xs text-slate/75 dark:text-slate-400">
                Cupos y ubicacion por fecha.
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Flujo
              </p>
              <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">Directo</p>
              <p className="mt-1 text-xs text-slate/75 dark:text-slate-400">
                Del detalle a la reserva del cupo.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(courses || []).map((course) => (
          <Card
            key={String(course.id)}
            className="soft-panel rounded-[1.8rem] border-0 shadow-none"
          >
            <CardBody className="space-y-4 p-5">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  {String(course.level)}
                </p>
                <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100">
                  {String(course.title)}
                </h2>
                <p className="line-clamp-3 text-sm text-slate/80 dark:text-slate-300">
                  {String(course.description)}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="surface-card">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                    Duracion
                  </p>
                  <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                    {String(course.duration_hours)} horas
                  </p>
                </div>
                <div className="surface-card">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                    Inversion
                  </p>
                  <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                    {formatCurrency(Number(course.price_cents || 0))}
                  </p>
                </div>
              </div>

              <Button
                as="a"
                href={`/courses/${course.id}`}
                className="action-primary w-fit px-5 text-sm font-semibold"
              >
                Ver detalle
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
