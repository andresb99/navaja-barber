import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ActionButton, Card, ErrorText, Field, Label, MultilineField, MutedText, Screen } from '../../components/ui/primitives';
import { getAuthContext } from '../../lib/auth';
import { env } from '../../lib/env';
import { formatDateTime } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { palette } from '../../lib/theme';

interface ModelItem {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  instagram: string | null;
  notes_internal: string | null;
  attributes: Record<string, unknown> | null;
  photo_paths: string[] | null;
  marketing_opt_in: boolean;
  created_at: string;
}

function parsePreferences(attributes: Record<string, unknown> | null): string[] {
  if (!attributes) {
    return [];
  }
  const value = attributes.preferences;
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item)).filter(Boolean);
}

export default function AdminModelosScreen() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [models, setModels] = useState<ModelItem[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const selectedModel = useMemo(
    () => models.find((item) => item.id === selectedModelId) || null,
    [models, selectedModelId],
  );

  useEffect(() => {
    setNotesDraft(selectedModel?.notes_internal || '');
  }, [selectedModel]);

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

    let query = supabase
      .from('models')
      .select(
        'id, full_name, phone, email, instagram, notes_internal, attributes, photo_paths, marketing_opt_in, created_at',
      )
      .eq('shop_id', env.EXPO_PUBLIC_SHOP_ID)
      .order('created_at', { ascending: false })
      .limit(200);

    if (search.trim()) {
      const safeSearch = search.trim().replace(/[,]/g, ' ');
      query = query.or(`full_name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`);
    }

    const { data, error: fetchError } = await query;
    if (fetchError) {
      setModels([]);
      setLoading(false);
      setError(fetchError.message);
      return;
    }

    const mapped: ModelItem[] = (data || []).map((item) => ({
      id: String(item.id),
      full_name: String(item.full_name || ''),
      phone: String(item.phone || ''),
      email: item.email ? String(item.email) : null,
      instagram: item.instagram ? String(item.instagram) : null,
      notes_internal: item.notes_internal ? String(item.notes_internal) : null,
      attributes: (item.attributes as Record<string, unknown> | null) || null,
      photo_paths: Array.isArray(item.photo_paths)
        ? item.photo_paths.map((value) => String(value))
        : null,
      marketing_opt_in: Boolean(item.marketing_opt_in),
      created_at: String(item.created_at),
    }));

    setModels(mapped);
    const selectedStillExists = mapped.some((item) => item.id === selectedModelId);
    if (!selectedStillExists) {
      setSelectedModelId(mapped[0]?.id || '');
    }
    setLoading(false);
  }, [search, selectedModelId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  async function saveNotes() {
    if (!selectedModel) {
      return;
    }

    setSavingNotes(true);
    setError(null);
    setSuccess(null);

    const { error: updateError } = await supabase
      .from('models')
      .update({ notes_internal: notesDraft || null })
      .eq('id', selectedModel.id);

    if (updateError) {
      setSavingNotes(false);
      setError(updateError.message);
      return;
    }

    setModels((current) =>
      current.map((item) =>
        item.id === selectedModel.id ? { ...item, notes_internal: notesDraft || null } : item,
      ),
    );
    setSavingNotes(false);
    setSuccess('Notas internas actualizadas.');
  }

  if (!allowed && !loading) {
    return (
      <Screen title="Modelos" subtitle="Acceso restringido">
        <Card>
          <Text style={styles.error}>No tienes permisos de admin.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Modelos" subtitle="Ficha de modelos y notas internas">
      <Card>
        <Label>Buscar por nombre o telefono</Label>
        <Field value={search} onChangeText={setSearch} placeholder="Ej: Ana o 099..." />
        <ActionButton label="Buscar" onPress={() => void loadData()} />
      </Card>

      <ErrorText message={error} />
      {success ? <Text style={styles.success}>{success}</Text> : null}
      {loading ? <MutedText>Cargando modelos...</MutedText> : null}
      {!loading && models.length === 0 ? <MutedText>No hay modelos registrados.</MutedText> : null}

      <Card>
        <Text style={styles.section}>Listado</Text>
        <View style={styles.list}>
          {models.map((item) => {
            const active = item.id === selectedModelId;
            return (
              <Pressable
                key={item.id}
                style={[styles.modelRow, active ? styles.modelRowActive : null]}
                onPress={() => setSelectedModelId(item.id)}
              >
                <Text style={styles.modelName}>{item.full_name}</Text>
                <Text style={styles.modelMeta}>{item.phone}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>Detalle</Text>
        {!selectedModel ? (
          <MutedText>Selecciona un modelo para ver su ficha.</MutedText>
        ) : (
          <View style={styles.detail}>
            <Text style={styles.detailName}>{selectedModel.full_name}</Text>
            <Text style={styles.detailMeta}>Telefono: {selectedModel.phone}</Text>
            <Text style={styles.detailMeta}>Email: {selectedModel.email || 'No informado'}</Text>
            <Text style={styles.detailMeta}>
              Instagram: {selectedModel.instagram || 'No informado'}
            </Text>
            <Text style={styles.detailMeta}>
              Preferencias:{' '}
              {parsePreferences(selectedModel.attributes).join(', ') || 'Sin preferencias'}
            </Text>
            <Text style={styles.detailMeta}>
              Fotos cargadas: {selectedModel.photo_paths?.length || 0}
            </Text>
            <Text style={styles.detailMeta}>
              Marketing: {selectedModel.marketing_opt_in ? 'Acepta' : 'No acepta'}
            </Text>
            <Text style={styles.detailMeta}>
              Alta: {formatDateTime(selectedModel.created_at)}
            </Text>

            <Label>Notas internas</Label>
            <MultilineField value={notesDraft} onChangeText={setNotesDraft} />
            <ActionButton
              label={savingNotes ? 'Guardando...' : 'Guardar notas'}
              onPress={saveNotes}
              disabled={savingNotes}
              loading={savingNotes}
            />
          </View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
  list: {
    gap: 8,
  },
  modelRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe4ee',
    backgroundColor: '#f8fafc',
    padding: 10,
    gap: 2,
  },
  modelRowActive: {
    borderColor: palette.accent,
    backgroundColor: '#fff7e6',
  },
  modelName: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 14,
  },
  modelMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  detail: {
    gap: 6,
  },
  detailName: {
    color: palette.text,
    fontWeight: '800',
    fontSize: 18,
  },
  detailMeta: {
    color: '#334155',
    fontSize: 13,
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
