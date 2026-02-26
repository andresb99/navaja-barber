import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  modelApplicationStatusUpdateSchema,
  modelRequirementsInputSchema,
  ModelApplicationStatus,
  ModelCompensationType,
} from '@navaja/shared';
import {
  ActionButton,
  Card,
  ErrorText,
  Field,
  Label,
  MultilineField,
  MutedText,
  Screen,
} from '../../../components/ui/primitives';
import { getAuthContext } from '../../../lib/auth';
import { formatDateTime } from '../../../lib/format';
import { supabase } from '../../../lib/supabase';
import { palette } from '../../../lib/theme';

interface SessionData {
  id: string;
  title: string;
  start_at: string;
  location: string;
  status: string;
}

interface ApplicationItem {
  id: string;
  session_id: string;
  model_id: string;
  status: ModelApplicationStatus;
  notes_internal: string | null;
  created_at: string;
  full_name: string;
  phone: string;
  email: string | null;
  instagram: string | null;
}

const reviewStatuses: ModelApplicationStatus[] = ['applied', 'waitlist', 'rejected'];
const attendanceStatuses: ModelApplicationStatus[] = ['confirmed', 'attended', 'no_show'];

function statusLabel(status: ModelApplicationStatus): string {
  if (status === 'applied') {
    return 'Postulado';
  }
  if (status === 'confirmed') {
    return 'Confirmado';
  }
  if (status === 'waitlist') {
    return 'Lista espera';
  }
  if (status === 'rejected') {
    return 'Rechazado';
  }
  if (status === 'no_show') {
    return 'No se presento';
  }
  return 'Asistio';
}

export default function AdminSessionModelosScreen() {
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = String(params.sessionId || '');

  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingRequirements, setSavingRequirements] = useState(false);
  const [savingApplicationId, setSavingApplicationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [session, setSession] = useState<SessionData | null>(null);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [applicationNotes, setApplicationNotes] = useState<Record<string, string>>({});

  const [modelsNeeded, setModelsNeeded] = useState('1');
  const [beardRequired, setBeardRequired] = useState(false);
  const [hairLengthCategory, setHairLengthCategory] = useState<
    'indistinto' | 'corto' | 'medio' | 'largo'
  >('indistinto');
  const [hairType, setHairType] = useState('');
  const [compensationType, setCompensationType] = useState<ModelCompensationType>('gratis');
  const [compensationValueCents, setCompensationValueCents] = useState('');
  const [notesPublic, setNotesPublic] = useState('');
  const [isOpen, setIsOpen] = useState(true);

  const confirmedCount = useMemo(
    () => applications.filter((item) => item.status === 'confirmed').length,
    [applications],
  );
  const applicationsToReview = useMemo(
    () => applications.filter((item) => reviewStatuses.includes(item.status)),
    [applications],
  );
  const confirmedAndAttendance = useMemo(
    () => applications.filter((item) => attendanceStatuses.includes(item.status)),
    [applications],
  );

  const loadData = useCallback(async () => {
    if (!sessionId) {
      setError('Sesion invalida.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const auth = await getAuthContext();
    if (auth.role !== 'admin') {
      setAllowed(false);
      setLoading(false);
      return;
    }
    setAllowed(true);

    const { data: sessionRow, error: sessionError } = await supabase
      .from('course_sessions')
      .select('id, start_at, location, status, course_id, courses(title)')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError || !sessionRow) {
      setLoading(false);
      setSession(null);
      setApplications([]);
      setError(sessionError?.message || 'No se encontro la sesion.');
      return;
    }

    setSession({
      id: String(sessionRow.id),
      title: String((sessionRow.courses as { title?: string } | null)?.title || 'Curso'),
      start_at: String(sessionRow.start_at),
      location: String(sessionRow.location || ''),
      status: String(sessionRow.status || ''),
    });

    const [{ data: requirementRow }, { data: applicationRows, error: applicationsError }] =
      await Promise.all([
        supabase
          .from('model_requirements')
          .select(
            'session_id, requirements, compensation_type, compensation_value_cents, notes_public, is_open',
          )
          .eq('session_id', sessionId)
          .maybeSingle(),
        supabase
          .from('model_applications')
          .select(
            'id, session_id, model_id, status, notes_internal, created_at, models(full_name, phone, email, instagram)',
          )
          .eq('session_id', sessionId)
          .order('created_at'),
      ]);

    if (applicationsError) {
      setLoading(false);
      setApplications([]);
      setError(applicationsError.message);
      return;
    }

    const mappedApplications: ApplicationItem[] = (applicationRows || []).map((item) => ({
      id: String(item.id),
      session_id: String(item.session_id),
      model_id: String(item.model_id),
      status: (String(item.status) as ModelApplicationStatus) || 'applied',
      notes_internal: item.notes_internal ? String(item.notes_internal) : null,
      created_at: String(item.created_at),
      full_name: String((item.models as { full_name?: string } | null)?.full_name || 'Modelo'),
      phone: String((item.models as { phone?: string } | null)?.phone || ''),
      email: (item.models as { email?: string } | null)?.email
        ? String((item.models as { email?: string } | null)?.email)
        : null,
      instagram: (item.models as { instagram?: string } | null)?.instagram
        ? String((item.models as { instagram?: string } | null)?.instagram)
        : null,
    }));
    setApplications(mappedApplications);

    const nextNotes: Record<string, string> = {};
    for (const item of mappedApplications) {
      nextNotes[item.id] = item.notes_internal || '';
    }
    setApplicationNotes(nextNotes);

    const req = (requirementRow?.requirements as Record<string, unknown> | null) || {};
    setModelsNeeded(String(Number(req.models_needed || 1)));
    setBeardRequired(Boolean(req.beard_required));
    setHairLengthCategory(
      (String(req.hair_length_category || 'indistinto') as
        | 'indistinto'
        | 'corto'
        | 'medio'
        | 'largo') || 'indistinto',
    );
    setHairType(String(req.hair_type || ''));
    setCompensationType(
      (String(requirementRow?.compensation_type || 'gratis') as ModelCompensationType) || 'gratis',
    );
    setCompensationValueCents(
      requirementRow?.compensation_value_cents == null
        ? ''
        : String(requirementRow.compensation_value_cents),
    );
    setNotesPublic(String(requirementRow?.notes_public || ''));
    setIsOpen(requirementRow ? Boolean(requirementRow.is_open) : true);

    setLoading(false);
  }, [sessionId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  async function saveRequirements() {
    if (!sessionId) {
      setError('Sesion invalida.');
      return;
    }

    const parsed = modelRequirementsInputSchema.safeParse({
      session_id: sessionId,
      models_needed: Number(modelsNeeded),
      beard_required: beardRequired,
      hair_length_category: hairLengthCategory,
      hair_type: hairType || null,
      compensation_type: compensationType,
      compensation_value_cents: compensationValueCents ? Number(compensationValueCents) : undefined,
      notes_public: notesPublic || null,
      is_open: isOpen,
    });

    if (!parsed.success) {
      setError('Revisa los requisitos de modelos.');
      return;
    }

    setSavingRequirements(true);
    setError(null);
    setSuccess(null);

    const { error: upsertError } = await supabase.from('model_requirements').upsert(
      {
        session_id: parsed.data.session_id,
        requirements: {
          models_needed: parsed.data.models_needed,
          beard_required: parsed.data.beard_required || false,
          hair_length_category: parsed.data.hair_length_category || 'indistinto',
          hair_type: parsed.data.hair_type || null,
        },
        compensation_type: parsed.data.compensation_type,
        compensation_value_cents:
          parsed.data.compensation_type === 'gratis'
            ? null
            : parsed.data.compensation_value_cents ?? null,
        notes_public: parsed.data.notes_public || null,
        is_open: parsed.data.is_open,
      },
      { onConflict: 'session_id' },
    );

    if (upsertError) {
      setSavingRequirements(false);
      setError(upsertError.message);
      return;
    }

    setSavingRequirements(false);
    setSuccess('Requisitos actualizados.');
    await loadData();
  }

  async function updateApplicationStatus(
    item: ApplicationItem,
    status: ModelApplicationStatus,
  ) {
    const parsed = modelApplicationStatusUpdateSchema.safeParse({
      application_id: item.id,
      status,
      notes_internal: applicationNotes[item.id] || null,
    });

    if (!parsed.success) {
      setError('Estado o notas invalidas.');
      return;
    }

    if (status === 'confirmed' && item.status !== 'confirmed') {
      const required = Number(modelsNeeded || 0);
      if (required > 0) {
        const { count, error: countError } = await supabase
          .from('model_applications')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', sessionId)
          .eq('status', 'confirmed');

        if (countError) {
          setError(countError.message);
          return;
        }
        if ((count || 0) >= required) {
          setError('No puedes confirmar mas modelos que el cupo definido.');
          return;
        }
      }
    }

    setSavingApplicationId(item.id);
    setError(null);
    setSuccess(null);

    const { error: updateError } = await supabase
      .from('model_applications')
      .update({
        status: parsed.data.status,
        notes_internal: parsed.data.notes_internal || null,
      })
      .eq('id', parsed.data.application_id);

    if (updateError) {
      setSavingApplicationId(null);
      setError(updateError.message);
      return;
    }

    setApplications((current) =>
      current.map((application) =>
        application.id === item.id
          ? {
              ...application,
              status: parsed.data.status,
              notes_internal: parsed.data.notes_internal || null,
            }
          : application,
      ),
    );
    setSavingApplicationId(null);
    setSuccess('Postulacion actualizada.');
  }

  if (!allowed && !loading) {
    return (
      <Screen title="Modelos por sesion" subtitle="Acceso restringido">
        <Card>
          <Text style={styles.error}>No tienes permisos de admin.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Modelos por sesion" subtitle="Configuracion, postulaciones y asistencia">
      <ErrorText message={error} />
      {success ? <Text style={styles.success}>{success}</Text> : null}
      {loading ? <MutedText>Cargando sesion...</MutedText> : null}

      {session ? (
        <>
          <Card>
            <Text style={styles.title}>{session.title}</Text>
            <Text style={styles.meta}>{formatDateTime(session.start_at)}</Text>
            <Text style={styles.meta}>{session.location}</Text>
            <Text style={styles.meta}>
              Estado sesion: {session.status} - Confirmados {confirmedCount}/{modelsNeeded}
            </Text>
          </Card>

          <Card>
            <Text style={styles.section}>Requisitos</Text>
            <Label>Modelos necesarios</Label>
            <Field value={modelsNeeded} onChangeText={setModelsNeeded} keyboardType="numeric" />
            <Label>Largo de pelo</Label>
            <View style={styles.rowWrap}>
              {(['indistinto', 'corto', 'medio', 'largo'] as const).map((option) => (
                <Pressable
                  key={option}
                  style={[styles.chip, hairLengthCategory === option ? styles.chipActive : null]}
                  onPress={() => setHairLengthCategory(option)}
                >
                  <Text
                    style={[styles.chipText, hairLengthCategory === option ? styles.chipTextActive : null]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Label>Tipo de pelo (opcional)</Label>
            <Field value={hairType} onChangeText={setHairType} />
            <View style={styles.rowWrap}>
              <Pressable style={styles.toggle} onPress={() => setBeardRequired((value) => !value)}>
                <Text style={styles.toggleText}>
                  {beardRequired ? 'Requiere barba: si' : 'Requiere barba: no'}
                </Text>
              </Pressable>
              <Pressable style={styles.toggle} onPress={() => setIsOpen((value) => !value)}>
                <Text style={styles.toggleText}>
                  {isOpen ? 'Convocatoria abierta' : 'Convocatoria cerrada'}
                </Text>
              </Pressable>
            </View>

            <Label>Compensacion</Label>
            <View style={styles.rowWrap}>
              {(['gratis', 'descuento', 'pago'] as const).map((option) => (
                <Pressable
                  key={option}
                  style={[styles.chip, compensationType === option ? styles.chipActive : null]}
                  onPress={() => setCompensationType(option)}
                >
                  <Text
                    style={[styles.chipText, compensationType === option ? styles.chipTextActive : null]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
            {compensationType !== 'gratis' ? (
              <>
                <Label>Valor compensacion (cents)</Label>
                <Field
                  value={compensationValueCents}
                  onChangeText={setCompensationValueCents}
                  keyboardType="numeric"
                />
              </>
            ) : null}

            <Label>Notas publicas</Label>
            <MultilineField value={notesPublic} onChangeText={setNotesPublic} />
            <ActionButton
              label={savingRequirements ? 'Guardando...' : 'Guardar requisitos'}
              onPress={() => void saveRequirements()}
              disabled={savingRequirements}
              loading={savingRequirements}
            />
          </Card>

          <Card>
            <Text style={styles.section}>Postulaciones</Text>
            {applicationsToReview.length === 0 ? (
              <MutedText>No hay postulaciones para revisar.</MutedText>
            ) : null}
            <View style={styles.list}>
              {applicationsToReview.map((item) => (
                <ApplicationCard
                  key={item.id}
                  item={item}
                  note={applicationNotes[item.id] || ''}
                  noteLabel="Nota interna"
                  loading={savingApplicationId === item.id}
                  onChangeNote={(value) =>
                    setApplicationNotes((current) => ({
                      ...current,
                      [item.id]: value,
                    }))
                  }
                  actions={[
                    {
                      label: 'Confirmar',
                      onPress: () => void updateApplicationStatus(item, 'confirmed'),
                    },
                    {
                      label: 'Lista espera',
                      onPress: () => void updateApplicationStatus(item, 'waitlist'),
                    },
                    {
                      label: 'Rechazar',
                      onPress: () => void updateApplicationStatus(item, 'rejected'),
                    },
                    {
                      label: 'Pendiente',
                      onPress: () => void updateApplicationStatus(item, 'applied'),
                    },
                  ]}
                />
              ))}
            </View>
          </Card>

          <Card>
            <Text style={styles.section}>Confirmados y asistencia</Text>
            {confirmedAndAttendance.length === 0 ? (
              <MutedText>No hay modelos confirmados aun.</MutedText>
            ) : null}
            <View style={styles.list}>
              {confirmedAndAttendance.map((item) => (
                <ApplicationCard
                  key={item.id}
                  item={item}
                  note={applicationNotes[item.id] || ''}
                  noteLabel="Nota de asistencia"
                  loading={savingApplicationId === item.id}
                  onChangeNote={(value) =>
                    setApplicationNotes((current) => ({
                      ...current,
                      [item.id]: value,
                    }))
                  }
                  actions={[
                    {
                      label: 'Asistio',
                      onPress: () => void updateApplicationStatus(item, 'attended'),
                    },
                    {
                      label: 'No se presento',
                      onPress: () => void updateApplicationStatus(item, 'no_show'),
                    },
                    {
                      label: 'Confirmado',
                      onPress: () => void updateApplicationStatus(item, 'confirmed'),
                    },
                  ]}
                />
              ))}
            </View>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function ApplicationCard({
  item,
  note,
  noteLabel,
  loading,
  onChangeNote,
  actions,
}: {
  item: ApplicationItem;
  note: string;
  noteLabel: string;
  loading: boolean;
  onChangeNote: (value: string) => void;
  actions: Array<{ label: string; onPress: () => void }>;
}) {
  return (
    <View style={styles.applicationCard}>
      <Text style={styles.applicationName}>{item.full_name}</Text>
      <Text style={styles.applicationMeta}>{item.phone || 'Sin telefono'}</Text>
      <Text style={styles.applicationMeta}>{item.instagram || 'Sin instagram'}</Text>
      <Text style={styles.applicationMeta}>Estado: {statusLabel(item.status)}</Text>
      <Text style={styles.applicationMeta}>Alta: {formatDateTime(item.created_at)}</Text>
      <Label>{noteLabel}</Label>
      <Field value={note} onChangeText={onChangeNote} />
      <View style={styles.rowWrap}>
        {actions.map((action) => (
          <Pressable
            key={`${item.id}-${action.label}`}
            style={[styles.actionChip, loading ? styles.actionChipDisabled : null]}
            onPress={action.onPress}
            disabled={loading}
          >
            <Text style={styles.actionChipText}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
  },
  meta: {
    color: '#475569',
    fontSize: 13,
  },
  section: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 16,
  },
  rowWrap: {
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
  toggle: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toggleText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    gap: 8,
  },
  applicationCard: {
    borderWidth: 1,
    borderColor: '#dbe4ee',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    padding: 10,
    gap: 4,
  },
  applicationName: {
    color: palette.text,
    fontWeight: '800',
    fontSize: 14,
  },
  applicationMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  actionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionChipDisabled: {
    opacity: 0.5,
  },
  actionChipText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '700',
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
  },
  success: {
    color: '#0f766e',
    fontSize: 13,
  },
});
