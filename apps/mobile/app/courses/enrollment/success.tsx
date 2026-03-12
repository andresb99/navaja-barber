import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ActionButton, Card, Chip, Screen } from '../../../components/ui/primitives';
import { useNavajaTheme } from '../../../lib/theme';

type PaymentState = 'approved' | 'pending' | 'failure';

function resolvePaymentState(input: string | null | undefined): PaymentState {
  const normalized = String(input || '')
    .trim()
    .toLowerCase();

  if (normalized === 'pending' || normalized === 'processing') {
    return 'pending';
  }

  if (normalized === 'failure' || normalized === 'rejected' || normalized === 'cancelled') {
    return 'failure';
  }

  return 'approved';
}

export default function CourseEnrollmentSuccessScreen() {
  const { colors } = useNavajaTheme();
  const params = useLocalSearchParams<{
    payment_status?: string;
    payment_intent?: string;
    title?: string;
    course?: string;
    shop?: string;
  }>();

  const paymentState = useMemo(
    () => resolvePaymentState(params.payment_status ? String(params.payment_status) : null),
    [params.payment_status],
  );
  const paymentIntentId = String(params.payment_intent || '').trim();
  const titleLabel = String(params.title || '').trim() || 'Curso';
  const courseId = String(params.course || '').trim();
  const shopSlug = String(params.shop || '').trim();

  const fallbackHref =
    shopSlug && courseId
      ? `/shops/${shopSlug}/courses/${courseId}`
      : courseId
        ? `/courses/${courseId}`
        : '/courses';
  const coursesHref = shopSlug ? `/shops/${shopSlug}/courses` : '/courses';

  const eyebrow =
    paymentState === 'approved'
      ? 'Pago aprobado'
      : paymentState === 'pending'
        ? 'Pago pendiente'
        : 'Pago no completado';
  const heading =
    paymentState === 'approved'
      ? paymentIntentId
        ? 'Inscripcion confirmada'
        : 'Pago aprobado'
      : paymentState === 'pending'
        ? 'Estamos esperando confirmacion'
        : 'No pudimos confirmar tu inscripcion';
  const description =
    paymentState === 'approved'
      ? paymentIntentId
        ? 'Tu cupo fue registrado correctamente.'
        : 'El pago fue aprobado. Estamos registrando tu cupo.'
      : paymentState === 'pending'
        ? 'Mercado Pago aun no confirmo el cobro. Te avisamos cuando termine el proceso.'
        : 'Puedes volver al curso para intentar de nuevo.';

  return (
    <Screen title="Estado de la inscripcion" subtitle="Seguimiento del pago del curso">
      <Card elevated>
        <View style={styles.header}>
          <Chip
            label={eyebrow}
            tone={
              paymentState === 'approved'
                ? 'success'
                : paymentState === 'pending'
                  ? 'warning'
                  : 'danger'
            }
          />
          <Text style={[styles.title, { color: colors.text }]}>{heading}</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>
        </View>
      </Card>

      <Card>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Curso</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{titleLabel}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Inscripcion</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {paymentIntentId || 'Pendiente'}
          </Text>
        </View>
      </Card>

      <ActionButton
        label={paymentState === 'failure' ? 'Reintentar pago' : 'Volver al curso'}
        onPress={() => router.replace(fallbackHref)}
      />
      <ActionButton
        label="Ver mas cursos"
        variant="secondary"
        onPress={() => router.replace(coursesHref)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
  },
  detailRow: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});
