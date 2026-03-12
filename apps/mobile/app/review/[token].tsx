import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  ActionButton,
  Card,
  ErrorText,
  Label,
  MultilineField,
  MutedText,
  Screen,
  SelectionChip,
} from '../../components/ui/primitives';
import {
  getReviewInvitePreviewViaApi,
  hasExternalApi,
  submitSignedReviewViaApi,
} from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { useNavajaTheme } from '../../lib/theme';

interface ReviewPreview {
  appointmentId: string;
  staffName: string;
  serviceName: string;
  appointmentStartAt: string;
  expiresAt: string;
}

export default function PublicReviewScreen() {
  const { colors } = useNavajaTheme();
  const params = useLocalSearchParams<{ token?: string }>();
  const signedToken = String(params.token || '');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<ReviewPreview | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!signedToken) {
      setLoading(false);
      setError('No se recibio un enlace de resena valido.');
      return;
    }

    if (!hasExternalApi) {
      setLoading(false);
      setError('Configura EXPO_PUBLIC_API_BASE_URL para abrir enlaces de resena.');
      return;
    }

    try {
      const response = await getReviewInvitePreviewViaApi({ signedToken });
      if (!response) {
        setPreview(null);
        setError('No se pudo validar el enlace de resena.');
      } else {
        setPreview({
          appointmentId: response.appointmentId,
          staffName: response.staffName,
          serviceName: response.serviceName,
          appointmentStartAt: response.appointmentStartAt,
          expiresAt: response.expiresAt,
        });
      }
    } catch (cause) {
      setPreview(null);
      setError(cause instanceof Error ? cause.message : 'No se pudo validar el enlace.');
    } finally {
      setLoading(false);
    }
  }, [signedToken]);

  useFocusEffect(
    useCallback(() => {
      void loadPreview();
    }, [loadPreview]),
  );

  async function submitReview() {
    if (!preview) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await submitSignedReviewViaApi({
        signedToken,
        rating,
        comment: comment.trim() || null,
      });

      if (!response?.reviewId) {
        throw new Error('No se pudo enviar la resena.');
      }

      setMessage('Resena enviada correctamente. Gracias por compartir tu experiencia.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo enviar la resena.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Tu experiencia" subtitle="Califica la cita desde este enlace seguro">
      {loading ? <MutedText>Validando enlace...</MutedText> : null}
      <ErrorText message={error} />
      {message ? <Text style={[styles.success, { color: colors.success }]}>{message}</Text> : null}

      {preview ? (
        <>
          <Card>
            <Text style={[styles.title, { color: colors.text }]}>
              {preview.serviceName} con {preview.staffName}
            </Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              Cita: {formatDateTime(preview.appointmentStartAt)}
            </Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              Expira: {formatDateTime(preview.expiresAt)}
            </Text>
          </Card>

          <Card>
            <Label>Puntaje</Label>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <SelectionChip
                  key={value}
                  label={String(value)}
                  active={rating === value}
                  onPress={() => setRating(value)}
                />
              ))}
            </View>

            <Label>Comentario (opcional)</Label>
            <MultilineField value={comment} onChangeText={setComment} />

            <ActionButton
              label={saving ? 'Enviando...' : 'Enviar resena'}
              onPress={() => {
                void submitReview();
              }}
              disabled={saving || Boolean(message)}
              loading={saving}
            />
          </Card>
        </>
      ) : null}

      <ActionButton
        label="Ir al inicio"
        variant="secondary"
        onPress={() => router.replace('/(tabs)/inicio')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    fontSize: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  success: {
    fontSize: 13,
    fontWeight: '600',
  },
});
