import { notFound } from 'next/navigation';
import { formatCurrency } from '@navaja/shared';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { CourseEnrollmentForm } from '@/components/public/course-enrollment-form';

interface CourseDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseDetailsPage({ params }: CourseDetailsPageProps) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: course } = await supabase
    .from('courses')
    .select('id, title, description, price_cents, duration_hours, level, is_active')
    .eq('id', id)
    .maybeSingle();

  if (!course || !course.is_active) {
    notFound();
  }

  const { data: sessions } = await supabase
    .from('course_sessions')
    .select('id, start_at, capacity, location, status')
    .eq('course_id', id)
    .eq('status', 'scheduled')
    .order('start_at');

  const sessionIds = (sessions || []).map((item) => item.id as string);
  const { data: enrollments } = sessionIds.length
    ? await supabase
        .from('course_enrollments')
        .select('session_id, status')
        .in('session_id', sessionIds)
        .in('status', ['pending', 'confirmed'])
    : { data: [] as Array<{ session_id: string; status: string }> };

  const enrollmentCount = new Map<string, number>();
  (enrollments || []).forEach((item) => {
    const key = String(item.session_id);
    enrollmentCount.set(key, (enrollmentCount.get(key) || 0) + 1);
  });

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-8">
        <div className="relative z-10">
          <p className="inline-flex rounded-full border border-slate/20 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/80 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            Detalle del curso
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.1rem] dark:text-slate-100">
            {String(course.title)}
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-slate/80 dark:text-slate-300">{String(course.description)}</p>
          <p className="mt-4 text-sm text-slate/80 dark:text-slate-300">
            {String(course.duration_hours)} horas - Nivel: {String(course.level)} -{' '}
            {formatCurrency(Number(course.price_cents || 0))}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl text-ink dark:text-slate-100">Proximas sesiones</h2>
        {(sessions || []).length === 0 ? <p className="text-sm text-slate/70">No hay sesiones programadas por ahora.</p> : null}

        {(sessions || []).map((session) => {
          const used = enrollmentCount.get(String(session.id)) || 0;
          const capacity = Number(session.capacity || 0);
          const seatsLeft = Math.max(0, capacity - used);

          return (
            <div
              key={String(session.id)}
              className="grid gap-4 rounded-2xl border border-slate/20 bg-white/75 p-4 md:grid-cols-[1fr_320px] dark:border-slate-700 dark:bg-slate-900/70"
            >
              <div>
                <p className="text-sm font-semibold text-ink dark:text-slate-100">
                  {new Date(String(session.start_at)).toLocaleString('es-UY')}
                </p>
                <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">Lugar: {String(session.location)}</p>
                <p className="mt-1 text-sm text-slate/80 dark:text-slate-300">{seatsLeft} cupos disponibles</p>
              </div>
              <CourseEnrollmentForm sessionId={String(session.id)} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
