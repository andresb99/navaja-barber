import { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { jobApplicationUpdateSchema } from '@navaja/shared';
import { ActionButton, Card, ErrorText, Field, Label, MutedText, Screen } from '../../components/ui/primitives';
import { getAuthContext } from '../../lib/auth';
import { env } from '../../lib/env';
import { formatDateTime } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { palette } from '../../lib/theme';

type ApplicantStatus = 'new' | 'contacted' | 'interview' | 'rejected' | 'hired';

interface ApplicantItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  instagram: string | null;
  experience_years: number;
  availability: string;
  cv_path: string | null;
  status: ApplicantStatus;
  notes: string | null;
  created_at: string;
}

const statusOptions: ApplicantStatus[] = ['new', 'contacted', 'interview', 'rejected', 'hired'];

const statusLabel: Record<ApplicantStatus, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  interview: 'Entrevista',
  rejected: 'Rechazado',
  hired: 'Contratado',
};

export default function AdminApplicantsScreen() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [applicants, setApplicants] = useState<ApplicantItem[]>([]);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, ApplicantStatus>>({});
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});
  const [signedUrls, setSignedUrls] = useState<Record<string, string | null>>({});

  const loadData = useCallback(async () => {
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

    const { data, error: fetchError } = await supabase
      .from('job_applications')
      .select(
        'id, name, phone, email, instagram, experience_years, availability, cv_path, status, notes, created_at',
      )
      .eq('shop_id', env.EXPO_PUBLIC_SHOP_ID)
      .order('created_at', { ascending: false })
      .limit(120);

    if (fetchError) {
      setApplicants([]);
      setLoading(false);
      setError(fetchError.message);
      return;
    }

    const mapped: ApplicantItem[] = (data || []).map((item) => ({
      id: String(item.id),
      name: String(item.name || ''),
      phone: String(item.phone || ''),
      email: String(item.email || ''),
      instagram: item.instagram ? String(item.instagram) : null,
      experience_years: Number(item.experience_years || 0),
      availability: String(item.availability || ''),
      cv_path: item.cv_path ? String(item.cv_path) : null,
      status: (String(item.status || 'new') as ApplicantStatus) || 'new',
      notes: item.notes ? String(item.notes) : null,
      created_at: String(item.created_at),
    }));
    setApplicants(mapped);

    const nextStatusDrafts: Record<string, ApplicantStatus> = {};
    const nextNotesDrafts: Record<string, string> = {};
    for (const item of mapped) {
      nextStatusDrafts[item.id] = item.status;
      nextNotesDrafts[item.id] = item.notes || '';
    }
    setStatusDrafts(nextStatusDrafts);
    setNotesDrafts(nextNotesDrafts);

    const signedEntries = await Promise.all(
      mapped.map(async (item) => {
        if (!item.cv_path) {
          return [item.id, null] as const;
        }
        const { data: urlData } = await supabase.storage
          .from('cvs')
          .createSignedUrl(item.cv_path, 60 * 10);
        return [item.id, urlData?.signedUrl || null] as const;
      }),
    );

    const nextSignedUrls: Record<string, string | null> = {};
    for (const [id, url] of signedEntries) {
      nextSignedUrls[id] = url;
    }
    setSignedUrls(nextSignedUrls);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  async function openCv(id: string) {
    const url = signedUrls[id];
    if (!url) {
      setError('No se encontro URL firmada para este CV.');
      return;
    }
    await Linking.openURL(url);
  }

  async function saveApplication(item: ApplicantItem) {
    const parsed = jobApplicationUpdateSchema.safeParse({
      application_id: item.id,
      status: statusDrafts[item.id] || item.status,
      notes: notesDrafts[item.id] || null,
    });

    if (!parsed.success) {
      setError('Revisa los datos de estado/notas.');
      return;
    }

    setSavingId(item.id);
    setError(null);
    setSuccess(null);

    const { error: updateError } = await supabase
      .from('job_applications')
      .update({
        status: parsed.data.status,
        notes: parsed.data.notes || null,
      })
      .eq('id', parsed.data.application_id);

    if (updateError) {
      setSavingId(null);
      setError(updateError.message);
      return;
    }

    setApplicants((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              status: parsed.data.status,
              notes: parsed.data.notes || null,
            }
          : entry,
      ),
    );
    setSavingId(null);
    setSuccess(`Postulacion actualizada: ${item.name}`);
  }

  if (!allowed && !loading) {
    return (
      <Screen title="Postulantes" subtitle="Acceso restringido">
        <Card>
          <Text style={styles.error}>No tienes permisos de admin.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Postulantes" subtitle="Revision y seguimiento de candidatos">
      <ErrorText message={error} />
      {success ? <Text style={styles.success}>{success}</Text> : null}
      {loading ? <MutedText>Cargando postulaciones...</MutedText> : null}
      {!loading && applicants.length === 0 ? <MutedText>No hay postulaciones.</MutedText> : null}

      <View style={styles.list}>
        {applicants.map((item) => (
          <Card key={item.id}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.email} - {item.phone}
            </Text>
            <Text style={styles.meta}>
              {item.experience_years} anios - {formatDateTime(item.created_at)}
            </Text>
            <Text style={styles.meta}>Instagram: {item.instagram || 'No informado'}</Text>
            <Text style={styles.meta}>Disponibilidad: {item.availability}</Text>

            <Pressable style={styles.cvButton} onPress={() => void openCv(item.id)}>
              <Text style={styles.cvButtonText}>
                {signedUrls[item.id] ? 'Abrir CV firmado' : 'CV no disponible'}
              </Text>
            </Pressable>

            <Label>Estado</Label>
            <View style={styles.statusRow}>
              {statusOptions.map((status) => {
                const active = (statusDrafts[item.id] || item.status) === status;
                return (
                  <Pressable
                    key={status}
                    style={[styles.statusChip, active ? styles.statusChipActive : null]}
                    onPress={() =>
                      setStatusDrafts((current) => ({
                        ...current,
                        [item.id]: status,
                      }))
                    }
                  >
                    <Text style={[styles.statusChipText, active ? styles.statusChipTextActive : null]}>
                      {statusLabel[status]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Label>Notas internas</Label>
            <Field
              value={notesDrafts[item.id] || ''}
              onChangeText={(value) =>
                setNotesDrafts((current) => ({
                  ...current,
                  [item.id]: value,
                }))
              }
            />
            <ActionButton
              label={savingId === item.id ? 'Guardando...' : 'Guardar cambios'}
              onPress={() => void saveApplication(item)}
              disabled={savingId === item.id}
              loading={savingId === item.id}
            />
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
  },
  name: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    color: '#475569',
    fontSize: 12,
  },
  cvButton: {
    borderWidth: 1,
    borderColor: '#dbe4ee',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  cvButtonText: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 13,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusChipActive: {
    borderColor: palette.text,
    backgroundColor: palette.text,
  },
  statusChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  statusChipTextActive: {
    color: '#fff',
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
