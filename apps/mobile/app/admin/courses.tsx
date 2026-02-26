import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { courseSessionUpsertSchema, courseUpsertSchema } from '@navaja/shared';
import { ActionButton, Card, ErrorText, Field, Label, MutedText, MultilineField, Screen } from '../../components/ui/primitives';
import { getAuthContext } from '../../lib/auth';
import { env } from '../../lib/env';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { palette } from '../../lib/theme';

interface CourseItem {
  id: string;
  title: string;
  level: string;
  price_cents: number;
  duration_hours: number;
  is_active: boolean;
}

interface SessionItem {
  id: string;
  course_id: string;
  start_at: string;
  capacity: number;
  location: string;
  status: string;
}

interface EnrollmentItem {
  id: string;
  session_id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
}

export default function AdminCoursesScreen() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);

  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [coursePrice, setCoursePrice] = useState('');
  const [courseHours, setCourseHours] = useState('');
  const [courseLevel, setCourseLevel] = useState('');

  const [sessionCourseId, setSessionCourseId] = useState('');
  const [sessionStartAt, setSessionStartAt] = useState('');
  const [sessionCapacity, setSessionCapacity] = useState('10');
  const [sessionLocation, setSessionLocation] = useState('');
  const [sessionStatus, setSessionStatus] = useState<'scheduled' | 'cancelled' | 'completed'>('scheduled');

  const enrollmentCount = useMemo(() => {
    const map = new Map<string, number>();
    enrollments.forEach((item) => {
      map.set(item.session_id, (map.get(item.session_id) || 0) + 1);
    });
    return map;
  }, [enrollments]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const auth = await getAuthContext();
    if (auth.role !== 'admin') {
      setAllowed(false);
      setLoading(false);
      return;
    }
    setAllowed(true);

    const { data: courseRows, error: courseError } = await supabase
      .from('courses')
      .select('id, title, level, price_cents, duration_hours, is_active')
      .eq('shop_id', env.EXPO_PUBLIC_SHOP_ID)
      .order('title');

    if (courseError) {
      setLoading(false);
      setError(courseError.message);
      return;
    }

    const mappedCourses = (courseRows || []).map((item) => ({
      id: String(item.id),
      title: String(item.title),
      level: String(item.level || ''),
      price_cents: Number(item.price_cents || 0),
      duration_hours: Number(item.duration_hours || 0),
      is_active: Boolean(item.is_active),
    }));
    setCourses(mappedCourses);
    const firstCourse = mappedCourses[0];
    if (firstCourse && !sessionCourseId) {
      setSessionCourseId(firstCourse.id);
    }

    const courseIds = mappedCourses.map((item) => item.id);
    const [{ data: sessionRows }, { data: enrollmentRows }] = await Promise.all([
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
            .select('id, session_id, name, phone, email, status, created_at')
            .order('created_at', { ascending: false })
        : { data: [] as Array<Record<string, unknown>> },
    ]);

    setSessions(
      (sessionRows || []).map((item) => ({
        id: String(item.id),
        course_id: String(item.course_id),
        start_at: String(item.start_at),
        capacity: Number(item.capacity || 0),
        location: String(item.location || ''),
        status: String(item.status || ''),
      })),
    );
    setEnrollments(
      (enrollmentRows || []).map((item) => ({
        id: String(item.id),
        session_id: String(item.session_id),
        name: String(item.name || ''),
        phone: String(item.phone || ''),
        email: String(item.email || ''),
        status: String(item.status || ''),
        created_at: String(item.created_at || ''),
      })),
    );
    setLoading(false);
  }, [sessionCourseId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  async function createCourse() {
    const parsed = courseUpsertSchema.safeParse({
      shop_id: env.EXPO_PUBLIC_SHOP_ID,
      title: courseTitle,
      description: courseDescription,
      price_cents: Number(coursePrice),
      duration_hours: Number(courseHours),
      level: courseLevel,
      is_active: true,
      image_url: null,
    });

    if (!parsed.success) {
      setError('Revisa los datos del curso.');
      return;
    }

    setSaving(true);
    const { error: insertError } = await supabase.from('courses').insert(parsed.data);
    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    setSaving(false);
    setCourseTitle('');
    setCourseDescription('');
    setCoursePrice('');
    setCourseHours('');
    setCourseLevel('');
    await loadData();
  }

  async function createSession() {
    const parsed = courseSessionUpsertSchema.safeParse({
      course_id: sessionCourseId,
      start_at: sessionStartAt,
      capacity: Number(sessionCapacity),
      location: sessionLocation,
      status: sessionStatus,
    });

    if (!parsed.success) {
      setError('Revisa los datos de la sesión.');
      return;
    }

    setSaving(true);
    const { error: insertError } = await supabase.from('course_sessions').insert(parsed.data);
    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    setSaving(false);
    setSessionStartAt('');
    setSessionCapacity('10');
    setSessionLocation('');
    setSessionStatus('scheduled');
    await loadData();
  }

  if (!allowed && !loading) {
    return (
      <Screen title="Cursos" subtitle="Acceso restringido">
        <Card>
          <Text style={styles.error}>No tienes permisos de admin.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Cursos" subtitle="Gestión de cursos, sesiones e inscripciones">
      <ErrorText message={error} />

      <Card>
        <Text style={styles.section}>Crear curso</Text>
        <Label>Título</Label>
        <Field value={courseTitle} onChangeText={setCourseTitle} />
        <Label>Descripción</Label>
        <MultilineField value={courseDescription} onChangeText={setCourseDescription} />
        <Label>Precio (cents)</Label>
        <Field value={coursePrice} onChangeText={setCoursePrice} keyboardType="numeric" />
        <Label>Duración (horas)</Label>
        <Field value={courseHours} onChangeText={setCourseHours} keyboardType="numeric" />
        <Label>Nivel</Label>
        <Field value={courseLevel} onChangeText={setCourseLevel} />
        <ActionButton
          label={saving ? 'Guardando...' : 'Guardar curso'}
          onPress={() => void createCourse()}
          disabled={!courseTitle || !courseDescription || !coursePrice || !courseHours || !courseLevel || saving}
          loading={saving}
        />
      </Card>

      <Card>
        <Text style={styles.section}>Crear sesión</Text>
        <Label>Curso</Label>
        <View style={styles.chips}>
          {courses.map((course) => (
            <Pressable
              key={course.id}
              style={[styles.chip, sessionCourseId === course.id ? styles.chipActive : null]}
              onPress={() => setSessionCourseId(course.id)}
            >
              <Text style={[styles.chipText, sessionCourseId === course.id ? styles.chipTextActive : null]}>
                {course.title}
              </Text>
            </Pressable>
          ))}
        </View>
        <Label>Inicio (ISO)</Label>
        <Field value={sessionStartAt} onChangeText={setSessionStartAt} placeholder="2026-03-01T14:00:00Z" />
        <Label>Capacidad</Label>
        <Field value={sessionCapacity} onChangeText={setSessionCapacity} keyboardType="numeric" />
        <Label>Ubicación</Label>
        <Field value={sessionLocation} onChangeText={setSessionLocation} />
        <Label>Estado</Label>
        <View style={styles.row}>
          {(['scheduled', 'cancelled', 'completed'] as const).map((status) => (
            <Pressable
              key={status}
              style={[styles.chip, sessionStatus === status ? styles.chipActive : null]}
              onPress={() => setSessionStatus(status)}
            >
              <Text style={[styles.chipText, sessionStatus === status ? styles.chipTextActive : null]}>
                {status}
              </Text>
            </Pressable>
          ))}
        </View>
        <ActionButton
          label="Guardar sesión"
          onPress={() => void createSession()}
          disabled={!sessionCourseId || !sessionStartAt || !sessionLocation || saving}
        />
      </Card>

      <Card>
        <Text style={styles.section}>Catálogo</Text>
        {loading ? <MutedText>Cargando...</MutedText> : null}
        <View style={styles.list}>
          {courses.map((course) => {
            const scopedSessions = sessions.filter((session) => session.course_id === course.id);
            return (
              <View key={course.id} style={styles.item}>
                <Text style={styles.itemTitle}>{course.title}</Text>
                <Text style={styles.itemMeta}>
                  {formatCurrency(course.price_cents)} - {course.duration_hours} h - Nivel {course.level} -{' '}
                  {course.is_active ? 'Activo' : 'Inactivo'}
                </Text>
                {scopedSessions.map((session) => (
                  <Pressable
                    key={session.id}
                    style={styles.session}
                    onPress={() =>
                      router.push({
                        pathname: '/admin/session-modelos/[sessionId]',
                        params: { sessionId: session.id },
                      })
                    }
                  >
                    <Text style={styles.sessionTitle}>
                      {formatDateTime(session.start_at)} - {session.location}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {session.status} - {enrollmentCount.get(session.id) || 0}/{session.capacity} inscriptos
                    </Text>
                    <Text style={styles.sessionLink}>Gestionar modelos</Text>
                  </Pressable>
                ))}
              </View>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>Inscripciones recientes</Text>
        <View style={styles.list}>
          {enrollments.slice(0, 30).map((enrollment) => (
            <View key={enrollment.id} style={styles.item}>
              <Text style={styles.itemTitle}>{enrollment.name}</Text>
              <Text style={styles.itemMeta}>
                {enrollment.email} - {enrollment.phone} - {enrollment.status}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipActive: {
    borderColor: palette.text,
    backgroundColor: palette.text,
  },
  chipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  list: {
    gap: 8,
  },
  item: {
    borderWidth: 1,
    borderColor: '#dbe4ee',
    borderRadius: 12,
    padding: 10,
    gap: 4,
    backgroundColor: '#f8fafc',
  },
  itemTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  itemMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  session: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#dbe4ee',
    borderRadius: 10,
    padding: 8,
    backgroundColor: '#fff',
    gap: 2,
  },
  sessionTitle: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '600',
  },
  sessionLink: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '700',
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
  },
});
