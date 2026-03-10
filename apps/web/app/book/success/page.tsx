import type { Metadata } from 'next';
import { BadgeCheck, CircleX, Clock3 } from 'lucide-react';
import { Button } from '@heroui/button';
import { resolveBookingSuccessState, type BookingSuccessState } from '@/lib/booking-success-state';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { buildSitePageMetadata } from '@/lib/site-metadata';

interface SuccessPageProps {
  searchParams: Promise<{
    appointment?: string;
    start?: string;
    staff?: string;
    service?: string;
    payment_intent?: string;
    payment_status?: string;
  }>;
}

export const metadata: Metadata = buildSitePageMetadata({
  title: 'Estado de la reserva',
  description: 'Estado del pago y confirmacion de una reserva.',
  path: '/book/success',
  noIndex: true,
});

interface ResolvedBookingResult {
  appointmentId: string | null;
  paymentState: BookingSuccessState;
}

interface PaymentIntentRow {
  status: string;
  provider_payment_id: string | null;
  payload: Record<string, unknown> | null;
}

async function resolveBookingResult(params: Awaited<SuccessPageProps['searchParams']>) {
  const directAppointmentId = String(params.appointment || '').trim() || null;
  const paymentIntentId = String(params.payment_intent || '').trim() || null;
  const requestedPaymentState = String(params.payment_status || '').trim() || null;

  if (directAppointmentId || !paymentIntentId) {
    return {
      appointmentId: directAppointmentId,
      paymentState: resolveBookingSuccessState({
        appointmentId: directAppointmentId,
        queryPaymentStatus: requestedPaymentState,
      }),
    } satisfies ResolvedBookingResult;
  }

  const admin = createSupabaseAdminClient();
  const { data: paymentIntent } = await admin
    .from('payment_intents')
    .select('status, provider_payment_id, payload')
    .eq('id', paymentIntentId)
    .maybeSingle();

  if (!paymentIntent) {
    return {
      appointmentId: null,
      paymentState: resolveBookingSuccessState({
        queryPaymentStatus: requestedPaymentState,
      }),
    } satisfies ResolvedBookingResult;
  }

  const row = paymentIntent as PaymentIntentRow;
  const payloadAppointmentId =
    typeof row.payload?.appointment_id === 'string' ? row.payload.appointment_id : null;

  return {
    appointmentId: payloadAppointmentId || null,
    paymentState: resolveBookingSuccessState({
      appointmentId: payloadAppointmentId || null,
      queryPaymentStatus: requestedPaymentState,
      intentPaymentStatus: row.status,
      providerPaymentId: row.provider_payment_id,
    }),
  } satisfies ResolvedBookingResult;
}

export default async function BookingSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const result = await resolveBookingResult(params);

  const eyebrow =
    result.paymentState === 'approved'
      ? 'Pago aprobado'
      : result.paymentState === 'pending'
        ? 'Pago en revision'
        : 'Pago no completado';
  const title =
    result.paymentState === 'approved'
      ? result.appointmentId
        ? 'Reserva confirmada'
        : 'Pago aprobado'
      : result.paymentState === 'pending'
        ? 'Reserva aun no confirmada'
        : 'No reservamos tu turno';
  const description =
    result.paymentState === 'approved'
      ? result.appointmentId
        ? 'Tu turno ya fue generado. Te confirmamos en breve por WhatsApp o email.'
        : 'El pago se aprobo. Estamos creando tu cita y la veras reflejada en breve.'
      : result.paymentState === 'pending'
        ? 'Mercado Pago registro el intento, pero tu turno solo queda reservado cuando el cobro figure como aprobado.'
        : 'No detectamos un pago completado. Mientras no finalices el pago, el turno no queda reservado.';
  const eyebrowClassName =
    result.paymentState === 'approved'
      ? 'hero-eyebrow border-emerald-300/70 bg-emerald-100/80 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200'
      : result.paymentState === 'pending'
        ? 'hero-eyebrow border-amber-300/70 bg-amber-100/80 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200'
        : 'hero-eyebrow border-rose-300/70 bg-rose-100/80 text-rose-900 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200';
  const EyebrowIcon =
    result.paymentState === 'approved'
      ? BadgeCheck
      : result.paymentState === 'pending'
        ? Clock3
        : CircleX;

  return (
    <section className="mx-auto max-w-2xl">
      <div className="section-hero px-6 py-8 md:px-8">
        <div className="relative z-10">
          <p className={eyebrowClassName}>
            <EyebrowIcon className="h-3.5 w-3.5" />
            {eyebrow}
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink dark:text-slate-100">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">{description}</p>

          <dl className="mt-6 grid gap-2 text-sm">
            <div className="surface-card">
              <dt className="text-xs uppercase tracking-[0.12em] text-slate/65">ID de cita</dt>
              <dd className="mt-1 font-medium text-ink dark:text-slate-100">
                {result.appointmentId || 'Sin confirmar'}
              </dd>
            </div>
            <div className="surface-card">
              <dt className="text-xs uppercase tracking-[0.12em] text-slate/65">Servicio</dt>
              <dd className="mt-1 font-medium text-ink dark:text-slate-100">
                {params.service || 'Servicio seleccionado'}
              </dd>
            </div>
            <div className="surface-card">
              <dt className="text-xs uppercase tracking-[0.12em] text-slate/65">Barbero</dt>
              <dd className="mt-1 font-medium text-ink dark:text-slate-100">
                {params.staff || 'Asignado'}
              </dd>
            </div>
            <div className="surface-card">
              <dt className="text-xs uppercase tracking-[0.12em] text-slate/65">
                Horario de inicio (UTC)
              </dt>
              <dd className="mt-1 font-medium text-ink dark:text-slate-100">
                {params.start || 'A confirmar'}
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            {result.paymentState === 'approved' ? (
              <Button as="a" href="/book" className="action-primary px-5 text-sm font-semibold">
                Agendar otra
              </Button>
            ) : (
              <Button as="a" href="/book" className="action-primary px-5 text-sm font-semibold">
                Volver a intentar
              </Button>
            )}
            <Button
              as="a"
              href="/"
              variant="ghost"
              className="action-secondary px-5 text-sm font-semibold"
            >
              Volver al inicio
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
