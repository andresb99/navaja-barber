import Link from 'next/link';
import { formatCurrency } from '@navaja/shared';
import { SHOP_ID } from '@/lib/constants';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { upsertCourseAction, upsertCourseSessionAction } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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
          .select('id, session_id, name, phone, email, status, created_at, course_sessions(course_id)')
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

  return (
    <section className="space-y-6">
      <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink">Cursos</h1>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>Crear curso</CardTitle>
          <CardDescription>Agrega una capacitacion al catalogo publico.</CardDescription>
          <form action={upsertCourseAction} className="mt-4 grid gap-3">
            <input type="hidden" name="shop_id" value={SHOP_ID} />
            <Input name="title" placeholder="Titulo del curso" required />
            <Textarea name="description" rows={4} placeholder="Descripcion" required />
            <div className="grid grid-cols-3 gap-3">
              <Input name="price_cents" type="number" placeholder="Precio en cents" required />
              <Input name="duration_hours" type="number" placeholder="Horas" required />
              <Input name="level" placeholder="Nivel" required />
            </div>
            <Input name="image_url" placeholder="URL de imagen (opcional)" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_active" defaultChecked /> Activo
            </label>
            <Button type="submit">Guardar curso</Button>
          </form>
        </Card>

        <Card>
          <CardTitle>Crear sesion</CardTitle>
          <CardDescription>Programa fechas y capacidad de cada curso.</CardDescription>
          <form action={upsertCourseSessionAction} className="mt-4 grid gap-3">
            <Select name="course_id" required>
              <option value="">Selecciona curso</option>
              {(courses || []).map((item) => (
                <option key={String(item.id)} value={String(item.id)}>
                  {String(item.title)}
                </option>
              ))}
            </Select>
            <Input name="start_at" type="datetime-local" required />
            <Input name="capacity" type="number" placeholder="Capacidad" defaultValue="10" required />
            <Input name="location" placeholder="Lugar" required />
            <Select name="status" defaultValue="scheduled">
              <option value="scheduled">Programada</option>
              <option value="cancelled">Cancelada</option>
              <option value="completed">Finalizada</option>
            </Select>
            <Button type="submit">Guardar sesion</Button>
          </form>
        </Card>
      </div>

      <Card>
        <CardTitle>Catalogo de cursos</CardTitle>
        <ul className="mt-3 space-y-3">
          {(courses || []).map((course) => {
            const scopedSessions = (sessions || []).filter((session) => String(session.course_id) === String(course.id));

            return (
              <li key={String(course.id)} className="rounded-lg border border-slate/20 p-4">
                <p className="font-medium text-ink">{String(course.title)}</p>
                <p className="text-xs text-slate/70">
                  {formatCurrency(Number(course.price_cents || 0))} - {String(course.duration_hours)} horas - Nivel{' '}
                  {String(course.level)} - {course.is_active ? 'Activo' : 'Inactivo'}
                </p>

                <div className="mt-2 space-y-2">
                  {scopedSessions.map((session) => (
                    <div key={String(session.id)} className="rounded-md bg-slate/5 p-2 text-xs">
                      <p>
                        {new Date(String(session.start_at)).toLocaleString('es-UY')} - {String(session.location)} -{' '}
                        {session.status === 'scheduled'
                          ? 'Programada'
                          : session.status === 'cancelled'
                            ? 'Cancelada'
                            : 'Finalizada'}
                      </p>
                      <p>
                        {enrollmentCount.get(String(session.id)) || 0}/{String(session.capacity)} inscriptos
                      </p>
                      <p className="mt-1">
                        <Link
                          href={`/admin/courses/sessions/${session.id}/modelos`}
                          className="font-medium text-ink no-underline"
                        >
                          Gestionar modelos
                        </Link>
                      </p>
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardTitle>Inscripciones recientes</CardTitle>
        <ul className="mt-3 space-y-2 text-sm">
          {(enrollments || []).slice(0, 30).map((enrollment) => (
            <li key={String(enrollment.id)} className="rounded-md bg-slate/5 p-2">
              <p className="font-medium text-ink">{String(enrollment.name)}</p>
              <p className="text-xs text-slate/70">
                {String(enrollment.email)} - {String(enrollment.phone)} -{' '}
                {enrollment.status === 'pending'
                  ? 'Pendiente'
                  : enrollment.status === 'confirmed'
                    ? 'Confirmada'
                    : 'Cancelada'}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
