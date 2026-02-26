import Link from 'next/link';
import { formatCurrency } from '@navaja/shared';
import { SHOP_ID } from '@/lib/constants';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';

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
      <div className="section-hero px-6 py-7 md:px-8 md:py-8">
        <div className="relative z-10">
          <p className="inline-flex rounded-full border border-slate/20 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/80 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            Academia Navaja
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.1rem] dark:text-slate-100">
            Cursos de barberia
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate/80 dark:text-slate-300">
            Anotate en proximas capacitaciones dictadas por nuestro equipo docente.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(courses || []).map((course) => (
          <Card key={String(course.id)}>
            <CardTitle>{String(course.title)}</CardTitle>
            <CardDescription className="line-clamp-3">{String(course.description)}</CardDescription>
            <div className="mt-3 space-y-1 text-sm text-slate/80 dark:text-slate-300">
              <p>{String(course.duration_hours)} horas</p>
              <p>Nivel: {String(course.level)}</p>
            </div>
            <p className="mt-2 text-base font-semibold text-ink dark:text-slate-100">
              {formatCurrency(Number(course.price_cents || 0))}
            </p>
            <Button asChild className="mt-4 w-fit">
              <Link href={`/courses/${course.id}`} className="no-underline">
                Ver detalle
              </Link>
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}
