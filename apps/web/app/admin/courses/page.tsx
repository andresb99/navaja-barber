import Link from 'next/link';
import { formatCurrency } from '@navaja/shared';
import { Card, CardBody } from '@heroui/card';
import { PencilLine } from 'lucide-react';
import { AdminCourseForm } from '@/components/admin/course-form';
import { AdminCourseEnrollmentsTable } from '@/components/admin/course-enrollments-table';
import { AdminCourseSessionForm } from '@/components/admin/course-session-form';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildAdminHref } from '@/lib/workspace-routes';
import { Container } from '@/components/heroui/container';

interface CoursesAdminPageProps {
  searchParams: Promise<{ shop?: string; edit?: string }>;
}

function parseModelCategories(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const category of value) {
    if (typeof category !== 'string') {
      continue;
    }

    const trimmed = category.trim();
    if (!trimmed) {
      continue;
    }

    const dedupeKey = trimmed.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    normalized.push(trimmed);
  }

  return normalized;
}

export default async function CoursesAdminPage({ searchParams }: CoursesAdminPageProps) {
  const params = await searchParams;
  const ctx = await requireAdmin({ shopSlug: params.shop });
  const editingCourseId = String(params.edit || '').trim();
  const supabase = await createSupabaseServerClient();

  const { data: courses } = await supabase
    .from('courses')
    .select(
      'id, title, description, level, price_cents, duration_hours, image_url, requires_model, model_categories, is_active',
    )
    .eq('shop_id', ctx.shopId)
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
  const editingCourse =
    (courses || []).find((course) => String(course.id) === editingCourseId) || null;
  const sessionsById = new Map((sessions || []).map((session) => [String(session.id), session]));
  const coursesById = new Map((courses || []).map((course) => [String(course.id), course]));
  const recentEnrollments = (enrollments || []).slice(0, 30);
  const enrollmentRows = recentEnrollments.map((enrollment) => {
    const session = sessionsById.get(String(enrollment.session_id || ''));
    const course = coursesById.get(String(session?.course_id || ''));

    return {
      id: String(enrollment.id),
      studentName: String(enrollment.name || 'Sin nombre'),
      courseTitle: String(course?.title || 'Curso'),
      email: String(enrollment.email || '-'),
      phone: String(enrollment.phone || '-'),
      status: String(enrollment.status || 'pending'),
      sessionStartLabel: session?.start_at
        ? new Date(String(session.start_at)).toLocaleString('es-UY')
        : 'Sin fecha',
      sessionLocation: String(session?.location || '-'),
      createdAtLabel: new Date(String(enrollment.created_at)).toLocaleString('es-UY'),
    };
  });

  return (
    <section className="space-y-6">
      <Container variant="pageHeader" className="px-6 py-7 md:px-8 md:py-9">
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
      </Container>

      {editingCourse ? (
        <Card className="spotlight-card soft-panel rounded-[1.8rem] border-0 shadow-none">
          <CardBody className="p-5">
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">Editar curso</h3>
            <p className="text-sm text-slate/80 dark:text-slate-300">
              Ajusta contenido, estado e imagen de {String(editingCourse.title)}.
            </p>
            <AdminCourseForm
              shopId={ctx.shopId}
              shopSlug={ctx.shopSlug}
              initialCourse={{
                id: String(editingCourse.id),
                title: String(editingCourse.title),
                description: String(editingCourse.description || ''),
                priceCents: Number(editingCourse.price_cents || 0),
                durationHours: Number(editingCourse.duration_hours || 0),
                level: String(editingCourse.level || 'Inicial'),
                imageUrl:
                  (typeof editingCourse.image_url === 'string' && editingCourse.image_url.trim()) ||
                  null,
                requiresModel: Boolean(editingCourse.requires_model),
                modelCategories: parseModelCategories(editingCourse.model_categories),
                isActive: Boolean(editingCourse.is_active),
              }}
              cancelHref={buildAdminHref('/admin/courses', ctx.shopSlug)}
            />
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="spotlight-card soft-panel rounded-[1.8rem] border-0 shadow-none">
          <CardBody className="p-5">
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">Crear curso</h3>
            <p className="text-sm text-slate/80 dark:text-slate-300">
              Agrega una capacitacion al catalogo publico.
            </p>
            <AdminCourseForm shopId={ctx.shopId} shopSlug={ctx.shopSlug} />
          </CardBody>
        </Card>

        <Card className="spotlight-card soft-panel rounded-[1.8rem] border-0 shadow-none">
          <CardBody className="p-5">
            <h3 className="text-xl font-semibold text-ink dark:text-slate-100">Crear sesion</h3>
            <p className="text-sm text-slate/80 dark:text-slate-300">
              Programa fechas y capacidad de cada curso.
            </p>
            <AdminCourseSessionForm
              shopId={ctx.shopId}
              shopSlug={ctx.shopSlug}
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
              const requiresModel = Boolean(course.requires_model);
              const modelCategories = parseModelCategories(course.model_categories);

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
                    <div className="flex items-center gap-2">
                      <Link
                        href={buildAdminHref('/admin/courses', ctx.shopSlug, {
                          edit: String(course.id),
                        })}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/55 text-ink transition hover:bg-white/78 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-white/[0.09]"
                        aria-label={`Editar curso ${String(course.title)}`}
                        title="Editar curso"
                      >
                        <PencilLine className="h-4 w-4" />
                      </Link>
                      <span
                        className="meta-chip"
                        data-tone={course.is_active ? 'success' : undefined}
                      >
                        {course.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                      {requiresModel ? (
                        <span className="meta-chip border-cyan-400/28 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200">
                          Requiere modelos
                        </span>
                      ) : null}
                    </div>
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

                  {requiresModel ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {modelCategories.length ? (
                        modelCategories.map((category) => (
                          <span
                            key={`${String(course.id)}-${category}`}
                            className="meta-chip border-cyan-400/24 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200"
                          >
                            {category}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate/70 dark:text-slate-400">
                          Sin categorias configuradas.
                        </span>
                      )}
                    </div>
                  ) : null}

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
                            href={buildAdminHref(
                              `/admin/courses/sessions/${session.id}/modelos`,
                              ctx.shopSlug,
                            )}
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
          <AdminCourseEnrollmentsTable rows={enrollmentRows} className="mt-4" />
        </CardBody>
      </Card>
    </section>
  );
}
