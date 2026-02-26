import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { modelRegistrationInputSchema } from '@navaja/shared';
import { ActionButton, Card, Chip, ErrorText, Field, Label, MutedText, Screen } from '../../components/ui/primitives';
import { env } from '../../lib/env';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { palette } from '../../lib/theme';
import { useFocusEffect } from 'expo-router';

interface OpenCall {
  session_id: string;
  course_title: string;
  start_at: string;
  location: string;
  compensation_type: 'gratis' | 'descuento' | 'pago';
  compensation_value_cents: number | null;
  notes_public: string | null;
  models_needed: number;
}

const preferenceOptions = [
  { value: 'barba', label: 'Barba' },
  { value: 'pelo_largo', label: 'Pelo largo' },
  { value: 'pelo_corto', label: 'Pelo corto' },
  { value: 'rulos', label: 'Rulos' },
  { value: 'coloracion', label: 'Coloracion' },
] as const;

export default function ModelosScreen() {
  const [openCalls, setOpenCalls] = useState<OpenCall[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [preferences, setPreferences] = useState<string[]>([]);
  const [consentPhotos, setConsentPhotos] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const selectedCall = useMemo(
    () => openCalls.find((item) => item.session_id === selectedSessionId) || null,
    [openCalls, selectedSessionId],
  );

  const loadOpenCalls = useCallback(async () => {
    setLoadingCalls(true);
    setError(null);

    const { data: requirementsRows, error: requirementsError } = await supabase
      .from('model_requirements')
      .select('session_id, requirements, compensation_type, compensation_value_cents, notes_public, is_open')
      .eq('is_open', true);

    if (requirementsError) {
      setOpenCalls([]);
      setLoadingCalls(false);
      setError(requirementsError.message);
      return;
    }

    const sessionIds = (requirementsRows || []).map((row) => String(row.session_id));
    if (!sessionIds.length) {
      setOpenCalls([]);
      setLoadingCalls(false);
      return;
    }

    const { data: sessionRows } = await supabase
      .from('course_sessions')
      .select('id, course_id, start_at, location, status')
      .in('id', sessionIds)
      .eq('status', 'scheduled');

    const courseIds = (sessionRows || []).map((row) => String(row.course_id));
    const { data: courseRows } = courseIds.length
      ? await supabase
          .from('courses')
          .select('id, title, is_active')
          .in('id', courseIds)
          .eq('is_active', true)
      : { data: [] as Array<Record<string, unknown>> };

    const sessionsById = new Map((sessionRows || []).map((row) => [String(row.id), row]));
    const coursesById = new Map((courseRows || []).map((row) => [String(row.id), row]));

    const calls = (requirementsRows || [])
      .map((row) => {
        const session = sessionsById.get(String(row.session_id));
        if (!session) {
          return null;
        }
        const course = coursesById.get(String(session.course_id));
        if (!course) {
          return null;
        }

        const req = (row.requirements as Record<string, unknown> | null) || {};
        return {
          session_id: String(row.session_id),
          course_title: String(course.title || 'Curso'),
          start_at: String(session.start_at),
          location: String(session.location || ''),
          compensation_type: row.compensation_type as OpenCall['compensation_type'],
          compensation_value_cents:
            row.compensation_value_cents == null ? null : Number(row.compensation_value_cents || 0),
          notes_public: row.notes_public ? String(row.notes_public) : null,
          models_needed: Number(req.models_needed || 0),
        } satisfies OpenCall;
      })
      .filter((item): item is OpenCall => item !== null)
      .sort((a, b) => (a.start_at < b.start_at ? -1 : 1));

    setOpenCalls(calls);
    const firstCall = calls[0];
    if (firstCall && !selectedSessionId) {
      setSelectedSessionId(firstCall.session_id);
    }
    setLoadingCalls(false);
  }, [selectedSessionId]);

  useFocusEffect(
    useCallback(() => {
      void loadOpenCalls();
    }, [loadOpenCalls]),
  );

  function togglePreference(value: string) {
    setPreferences((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  async function submitModelRegistration() {
    const parsed = modelRegistrationInputSchema.safeParse({
      shop_id: env.EXPO_PUBLIC_SHOP_ID,
      session_id: selectedSessionId || undefined,
      full_name: fullName,
      phone,
      email: email || null,
      instagram: instagram || null,
      preferences,
      consent_photos_videos: consentPhotos,
      marketing_opt_in: marketingOptIn,
    });

    if (!parsed.success) {
      setError('Revisa los datos del formulario.');
      return;
    }

    setLoadingSubmit(true);
    setError(null);
    setSuccess(null);

    const { data: model, error: modelError } = await supabase
      .from('models')
      .insert({
        shop_id: parsed.data.shop_id,
        full_name: parsed.data.full_name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        instagram: parsed.data.instagram || null,
        attributes: {
          preferences: parsed.data.preferences,
          consent_photos_videos: parsed.data.consent_photos_videos,
        },
        marketing_opt_in: parsed.data.marketing_opt_in,
      })
      .select('id')
      .single();

    if (modelError || !model) {
      setLoadingSubmit(false);
      setError(modelError?.message || 'No se pudo registrar el modelo.');
      return;
    }

    if (parsed.data.session_id) {
      const { error: appError } = await supabase.from('model_applications').insert({
        session_id: parsed.data.session_id,
        model_id: model.id,
        status: 'applied',
      });

      if (appError) {
        setLoadingSubmit(false);
        setError(appError.message);
        return;
      }

      if (parsed.data.consent_photos_videos) {
        await supabase.from('waivers').upsert(
          {
            session_id: parsed.data.session_id,
            model_id: model.id,
            waiver_version: 'v1',
            accepted_name: parsed.data.full_name,
          },
          { onConflict: 'session_id,model_id' },
        );
      }
    }

    setLoadingSubmit(false);
    setSuccess('¡Listo! Te vamos a contactar por WhatsApp.');
    setFullName('');
    setPhone('');
    setEmail('');
    setInstagram('');
    setPreferences([]);
    setConsentPhotos(false);
    setMarketingOptIn(false);
  }

  return (
    <Screen title="Modelos" subtitle="Convocatoria para prácticas de cursos">
      <Card>
        <Text style={styles.heroTitle}>Anotate como modelo</Text>
        <Text style={styles.heroText}>
          Si queres colaborar en prácticas reales de barbería, completa tus datos y te contactamos.
        </Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Sesiones con convocatoria abierta</Text>
        {loadingCalls ? <MutedText>Cargando convocatorias...</MutedText> : null}
        {!loadingCalls && openCalls.length === 0 ? (
          <MutedText>No hay convocatorias abiertas en este momento.</MutedText>
        ) : null}
        <View style={styles.list}>
          {openCalls.map((call) => {
            const selected = selectedSessionId === call.session_id;
            return (
              <Pressable
                key={call.session_id}
                onPress={() => setSelectedSessionId(call.session_id)}
                style={[styles.callCard, selected ? styles.callCardActive : null]}
              >
                <Text style={styles.callTitle}>{call.course_title}</Text>
                <Text style={styles.callMeta}>{formatDateTime(call.start_at)} - {call.location}</Text>
                <Text style={styles.callMeta}>
                  Cupos: {call.models_needed || 'Sin definir'} -{' '}
                  {call.compensation_type === 'gratis'
                    ? 'Gratis'
                    : call.compensation_value_cents
                      ? formatCurrency(call.compensation_value_cents)
                      : call.compensation_type}
                </Text>
                {call.notes_public ? <Text style={styles.callMeta}>{call.notes_public}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Formulario</Text>
        <Label>Nombre y apellido</Label>
        <Field value={fullName} onChangeText={setFullName} />
        <Label>Teléfono</Label>
        <Field value={phone} onChangeText={setPhone} />
        <Label>Email (opcional)</Label>
        <Field value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Label>Instagram (opcional)</Label>
        <Field value={instagram} onChangeText={setInstagram} />

        <Label>Sesión seleccionada</Label>
        <Text style={styles.selectedSessionText}>
          {selectedCall
            ? `${selectedCall.course_title} - ${formatDateTime(selectedCall.start_at)}`
            : 'Sin sesión (quedo para próximas convocatorias)'}
        </Text>

        <Label>Preferencias (opcional)</Label>
        <View style={styles.chipWrap}>
          {preferenceOptions.map((option) => {
            const active = preferences.includes(option.value);
            return (
              <Pressable
                key={option.value}
                style={[styles.prefChip, active ? styles.prefChipActive : null]}
                onPress={() => togglePreference(option.value)}
              >
                <Text style={[styles.prefChipText, active ? styles.prefChipTextActive : null]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.inline}>
          <Pressable onPress={() => setConsentPhotos((v) => !v)}>
            <Chip label={consentPhotos ? 'Acepta fotos/video' : 'Sin consentimiento multimedia'} tone={consentPhotos ? 'success' : 'neutral'} />
          </Pressable>
          <Pressable onPress={() => setMarketingOptIn((v) => !v)}>
            <Chip label={marketingOptIn ? 'Acepta novedades' : 'Sin novedades'} tone={marketingOptIn ? 'success' : 'neutral'} />
          </Pressable>
        </View>

        <ErrorText message={error} />
        {success ? <Text style={styles.success}>{success}</Text> : null}
        <ActionButton
          label={loadingSubmit ? 'Enviando...' : 'Anotarme como modelo'}
          onPress={submitModelRegistration}
          disabled={!fullName || !phone || loadingSubmit}
          loading={loadingSubmit}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroTitle: {
    color: palette.text,
    fontSize: 19,
    fontWeight: '800',
  },
  heroText: {
    color: '#475569',
    fontSize: 13,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
  list: {
    gap: 8,
  },
  callCard: {
    borderWidth: 1,
    borderColor: '#dbe4ee',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#f8fafc',
    gap: 2,
  },
  callCardActive: {
    borderColor: palette.accent,
    backgroundColor: '#fff7e6',
  },
  callTitle: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 14,
  },
  callMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  selectedSessionText: {
    color: '#334155',
    fontSize: 13,
    marginBottom: 4,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prefChip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  prefChipActive: {
    backgroundColor: palette.text,
    borderColor: palette.text,
  },
  prefChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  prefChipTextActive: {
    color: '#fff',
  },
  inline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  success: {
    color: '#0f766e',
    fontSize: 13,
  },
});
