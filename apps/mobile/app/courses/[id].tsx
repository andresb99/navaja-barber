import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { courseEnrollmentCreateSchema } from '@navaja/shared';
import { ActionButton, Card, ErrorText, Field, Label, MutedText, Screen } from '../../components/ui/primitives';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { palette } from '../../lib/theme';

interface CourseData {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  duration_hours: number;
  level: string;
}

interface SessionData {
  id: string;
  start_at: string;
  capacity: number;
  location: string;
  status: string;
}

export default function CourseDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [course, setCourse] = useState<CourseData | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [activeSessionId, sessions],
  );

  const loadData = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    setError(null);

    const [{ data: courseRow, error: courseError }, { data: sessionRows, error: sessionsError }] = await Promise.all([
      supabase
        .from('courses')
        .select('id, title, description, price_cents, duration_hours, level, is_active')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('course_sessions')
        .select('id, start_at, capacity, location, status')
        .eq('course_id', id)
        .eq('status', 'scheduled')
        .order('start_at'),
    ]);

    if (courseError || !courseRow || !courseRow.is_active) {
      setLoading(false);
      setCourse(null);
      setSessions([]);
      setError(courseError?.message || 'Curso no encontrado.');
      return;
    }

    if (sessionsError) {
      setLoading(false);
      setCourse(null);
      setSessions([]);
      setError(sessionsError.message);
      return;
    }

    setCourse({
      id: String(courseRow.id),
      title: String(courseRow.title),
      description: String(courseRow.description || ''),
      price_cents: Number(courseRow.price_cents || 0),
      duration_hours: Number(courseRow.duration_hours || 0),
      level: String(courseRow.level || ''),
    });

    const mappedSessions = (sessionRows || []).map((session) => ({
      id: String(session.id),
      start_at: String(session.start_at),
      capacity: Number(session.capacity || 0),
      location: String(session.location || ''),
      status: String(session.status || ''),
    }));
    setSessions(mappedSessions);
    const firstSession = mappedSessions[0];
    if (firstSession) {
      setActiveSessionId((current) => current || firstSession.id);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function submitEnrollment() {
    if (!activeSession) {
      setError('Selecciona una sesión.');
      return;
    }

    const parsed = courseEnrollmentCreateSchema.safeParse({
      session_id: activeSession.id,
      name,
      phone,
      email,
    });

    if (!parsed.success) {
      setError('Revisa los datos de inscripción.');
      return;
    }

    setSending(true);
    setError(null);
    setMessage(null);

    const { error: insertError } = await supabase.from('course_enrollments').insert({
      session_id: parsed.data.session_id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      status: 'pending',
    });

    if (insertError) {
      setSending(false);
      setError(insertError.message);
      return;
    }

    setSending(false);
    setMessage('Inscripción enviada. Te vamos a confirmar por WhatsApp.');
    setName('');
    setPhone('');
    setEmail('');
  }

  return (
    <Screen title="Detalle de curso" subtitle="Información y reserva de cupo">
      {loading ? <MutedText>Cargando curso...</MutedText> : null}
      <ErrorText message={error} />
      {!loading && !course ? <MutedText>No hay información para este curso.</MutedText> : null}

      {course ? (
        <>
          <Card>
            <Text style={styles.title}>{course.title}</Text>
            <Text style={styles.description}>{course.description}</Text>
            <Text style={styles.meta}>
              {course.duration_hours} h - Nivel {course.level}
            </Text>
            <Text style={styles.price}>{formatCurrency(course.price_cents)}</Text>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Sesiones programadas</Text>
            {sessions.length === 0 ? <MutedText>No hay sesiones activas en este momento.</MutedText> : null}
            <View style={styles.list}>
              {sessions.map((session) => (
                <Pressable
                  key={session.id}
                  style={[styles.sessionRow, activeSessionId === session.id ? styles.sessionRowActive : null]}
                  onPress={() => setActiveSessionId(session.id)}
                >
                  <Text style={styles.sessionTitle}>{formatDateTime(session.start_at)}</Text>
                  <Text style={styles.sessionMeta}>{session.location}</Text>
                  <Text style={styles.sessionMeta}>Capacidad: {session.capacity}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Anotarme a la sesión</Text>
            <Label>Nombre y apellido</Label>
            <Field value={name} onChangeText={setName} />
            <Label>Teléfono</Label>
            <Field value={phone} onChangeText={setPhone} />
            <Label>Email</Label>
            <Field value={email} onChangeText={setEmail} keyboardType="email-address" />
            {message ? <Text style={styles.success}>{message}</Text> : null}
            <ActionButton
              label={sending ? 'Enviando...' : 'Anotarme'}
              onPress={submitEnrollment}
              disabled={!activeSession || !name || !phone || !email || sending}
              loading={sending}
            />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '800',
  },
  description: {
    color: '#475569',
    fontSize: 13,
  },
  meta: {
    color: '#64748b',
    fontSize: 12,
  },
  price: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 16,
  },
  list: {
    gap: 8,
  },
  sessionRow: {
    borderWidth: 1,
    borderColor: '#dbe4ee',
    borderRadius: 12,
    padding: 10,
    gap: 1,
    backgroundColor: '#f8fafc',
  },
  sessionRowActive: {
    borderColor: palette.accent,
    backgroundColor: '#fff7e6',
  },
  sessionTitle: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 13,
  },
  sessionMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  success: {
    color: '#0f766e',
    fontSize: 13,
  },
});
