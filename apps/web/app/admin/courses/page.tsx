import Link from 'next/link';
import { formatCurrency } from '@navaja/shared';
import { Button } from '@heroui/button';
import { Card, CardBody } from '@heroui/card';
import { Input, Textarea } from '@heroui/input';
import { AdminCourseSessionForm } from '@/components/admin/course-session-form';
import { SHOP_ID } from '@/lib/constants';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { upsertCourseAction } from '@/app/admin/actions';

export default async function CoursesAdminPage() {
  const supabase = await createSupabaseServerClient();

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, level, price_cents, duration_hours, is_active')
    .eq('shop_id', SHOP_ID)
    .order('title');

  const courseIds = (courses || []).map((item) => item.id as string);

  const [{ data: sessions }, { data: enrollments }] = await Promise.all([
    courseIds.length
      ? supabase
          .from('course_sessions')
          .select('id, course_id, start_at, capacity, location, status')
          .in('course_id', courseIds)
          .order('start_at')
      : { data: [] as Array<Record<string, unknown>> },
    courseIds.length
      ? supabase
          .from('course_enrollments')
          .select(
            'id, session_id, name, phone, email, status, created_at, course_sessions(course_id)',
          )
          .order('created_at', { ascending: false })
      : { data: [] as Array<Record<string, unknown>> },
  ]);

  const enrollmentCount = new Map<string, number>();
  (enrollments || []).forEach((item) => {
    const sessionId = String(item.session_id || '');
    if (!sessionId) {
      return;
    }
    enrollmentCount.set(sessionId, (enrollmentCount.get(sessionId) || 0) + 1);
  });

  const activeCourses = (courses || []).filter((item) => item.is_active).length;

  return (
    <section className="space-y-6">
      <div className="section-hero px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="hero-eyebrow">Cursos</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.3rem] dark:text-slate-100">
              Gestion de academia, sesiones e inscripciones
            </h1>
            <p className="mt-3 text-sm text-slate/80 dark:text-slate-300">
              Catalogo y sesiones con mejor jerarquia visual para que se lean como producto, no como
              una lista anidada.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Cursos
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {(courses || []).length}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Activos
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {activeCourses}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Sesiones
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
                {(sessions || []).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="spotlight-card soft-panel rounded-[1.8rem] border-0 shadow-none">
          <CardBody className="p-5">
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">Crear curso</h3>
            <p className="text-sm text-slate/80 dark:text-slate-300">
              Agrega una capacitacion al catalogo publico.
            </p>
            <form action={upsertCourseAction} className="mt-4 grid gap-3">
              <input type="hidden" name="shop_id" value={SHOP_ID} />
              <Input name="title" label="Titulo del curso" labelPlacement="inside" required />
              <Textarea
                name="description"
                rows={4}
                label="Descripcion"
                labelPlacement="inside"
                required
              />
              <div className="grid grid-cols-3 gap-3">
                <Input
                  name="price_cents"
                  type="number"
                  label="Precio en cents"
                  labelPlacement="inside"
                  required
                />
                <Input
                  name="duration_hours"
                  type="number"
                  label="Horas"
                  labelPlacement="inside"
                  required
                />
                <Input name="level" label="Nivel" labelPlacement="inside" required />
              </div>
              <Input name="image_url" label="URL de imagen (opcional)" labelPlacement="inside" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_active" defaultChecked /> Activo
              </label>
              <Button type="submit" className="action-primary w-fit px-5 text-sm font-semibold">
                Guardar curso
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card className="spotlight-card soft-panel rounded-[1.8rem] border-0 shadow-none">
          <CardBody className="p-5">
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">Crear sesion</h3>
            <p className="text-sm text-slate/80 dark:text-slate-300">
              Programa fechas y capacidad de cada curso.
            </p>
            <AdminCourseSessionForm
              courses={(courses || []).map((item) => ({
                id: String(item.id),
                title: String(item.title),
              }))}
            />
          </CardBody>
        </Card>
      </div>

      <Card className="spotlight-card soft-panel rounded-[1.8rem] border-0 shadow-none">
        <CardBody className="p-5">
          <h3 className="text-xl font-semibold text-ink dark:text-slate-100">Catalogo de cursos</h3>
          {(courses || []).length === 0 ? (
            <p className="mt-3 text-sm text-slate/80 dark:text-slate-300">
              No hay cursos creados todavia.
            </p>
          ) : null}
          <ul className="mt-4 grid gap-4 xl:grid-cols-2">
            {(courses || []).map((course) => {
              const scopedSessions = (sessions || []).filter(
                (session) => String(session.course_id) === String(course.id),
              );

              return (
                <li key={String(course.id)} className="data-card rounded-[1.7rem] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                        Curso
                      </p>
                      <p className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
                        {String(course.title)}
                      </p>
                    </div>
                    <span
                      className="meta-chip"
                      data-tone={course.is_active ? 'success' : undefined}
                    >
                      {course.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/50 bg-white/34 px-3 py-2 dark:border-transparent dark:bg-white/[0.03]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                        Inversion
                      </p>
                      <p className="mt-1 text-sm font-semibold text-ink dark:text-slate-100">
                        {formatCurrency(Number(course.price_cents || 0))}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/50 bg-white/34 px-3 py-2 dark:border-transparent dark:bg-white/[0.03]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                        Duracion
                      </p>
                      <p className="mt-1 text-sm font-semibold text-ink dark:text-slate-100">
                        {String(course.duration_hours)} horas
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/50 bg-white/34 px-3 py-2 dark:border-transparent dark:bg-white/[0.03]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate/55 dark:text-slate-400">
                        Nivel
                      </p>
                      <p className="mt-1 text-sm font-semibold text-ink dark:text-slate-100">
                        {String(course.level)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {scopedSessions.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/40 px-3 py-3 text-sm text-slate/75 dark:border-transparent dark:text-slate-400">
                        Sin sesiones programadas.
                      </div>
                    ) : null}

                    {scopedSessions.map((session) => (
                      <div
                        key={String(session.id)}
                        className="rounded-2xl border border-white/50 bg-white/34 p-3 dark:border-transparent dark:bg-white/[0.03]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-ink dark:text-slate-100">
                              {new Date(String(session.start_at)).toLocaleString('es-UY')}
                            </p>
                            <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                              {String(session.location)}
                            </p>
                          </div>
                          <span
                            className="meta-chip border-sky-400/22 bg-sky-500/10 text-sky-700 dark:text-sky-200"
                            data-tone={session.status === 'cancelled' ? 'danger' : undefined}
                          >
                            {session.status === 'scheduled'
                              ? 'Programada'
                              : session.status === 'cancelled'
                                ? 'Cancelada'
                                : 'Finalizada'}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs text-slate/70 dark:text-slate-400">
                            {enrollmentCount.get(String(session.id)) || 0}/
                            {String(session.capacity)} inscriptos
                          </p>
                          <Link
                            href={`/admin/courses/sessions/${session.id}/modelos`}
                            className="inline-flex rounded-full border border-white/60 bg-white/46 px-3 py-1.5 no-underline text-[10px] font-semibold uppercase tracking-[0.16em] text-ink transition hover:bg-white/65 dark:border-transparent dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.06]"
                          >
                            Gestionar modelos
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>

      <Card className="spotlight-card soft-panel rounded-[1.8rem] border-0 shadow-none">
        <CardBody className="p-5">
          <h3 className="text-xl font-semibold text-ink dark:text-slate-100">
            Inscripciones recientes
          </h3>
          {(enrollments || []).length === 0 ? (
            <p className="mt-3 text-sm text-slate/80 dark:text-slate-300">
              Todavia no hay inscripciones.
            </p>
          ) : null}
          <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 text-sm">
            {(enrollments || []).slice(0, 30).map((enrollment) => (
              <li key={String(enrollment.id)} className="data-card rounded-2xl p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink dark:text-slate-100">
                      {String(enrollment.name)}
                    </p>
                    <p className="mt-1 text-xs text-slate/70 dark:text-slate-400">
                      {String(enrollment.email)}
                    </p>
                  </div>
                  <span
                    className="meta-chip"
                    data-tone={enrollment.status === 'confirmed' ? 'success' : undefined}
                  >
                    {enrollment.status === 'pending'
                      ? 'Pendiente'
                      : enrollment.status === 'confirmed'
                        ? 'Confirmada'
                        : 'Cancelada'}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate/70 dark:text-slate-400">
                  {String(enrollment.phone)}
                </p>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </section>
  );
}
