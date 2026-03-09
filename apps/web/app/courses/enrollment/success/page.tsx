import type { Metadata } from 'next';
import { BadgeCheck, CircleX, Clock3 } from 'lucide-react';
import { Button } from '@heroui/button';
import { getPublicTenantRouteContext } from '@/lib/public-tenant-context';
import { buildTenantCourseHref, buildTenantPublicHref } from '@/lib/shop-links';
import { buildSitePageMetadata } from '@/lib/site-metadata';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

interface CourseEnrollmentSuccessPageProps {
  searchParams: Promise<{
    payment_intent?: string;
    payment_status?: string;
    title?: string;
    course?: string;
    shop?: string;
  }>;
}

export const metadata: Metadata = buildSitePageMetadata({
  title: 'Estado de la inscripcion',
  description: 'Estado del pago y confirmacion de una inscripcion a curso.',
  path: '/courses/enrollment/success',
  noIndex: true,
});

type PaymentState = 'approved' | 'pending' | 'failure';

interface PaymentIntentRow {
  status: string;
  payload: Record<string, unknown> | null;
}

function resolvePaymentState(input: string | null | undefined): PaymentState {
  const normalized = String(input || '').trim().toLowerCase();
  if (normalized === 'pending' || normalized === 'processing') {
    return 'pending';
  }

  if (normalized === 'failure' || normalized === 'rejected' || normalized === 'cancelled') {
    return 'failure';
  }

  return 'approved';
}

async function resolveEnrollmentResult(
  params: Awaited<CourseEnrollmentSuccessPageProps['searchParams']>,
) {
  const paymentIntentId = String(params.payment_intent || '').trim() || null;
  const fallbackState = resolvePaymentState(params.payment_status);

  if (!paymentIntentId) {
    return {
      paymentState: fallbackState,
      enrollmentId: null as string | null,
    };
  }

  const admin = createSupabaseAdminClient();
  const { data: paymentIntent } = await admin
    .from('payment_intents')
    .select('status, payload')
    .eq('id', paymentIntentId)
    .maybeSingle();

  if (!paymentIntent) {
    return {
      paymentState: fallbackState,
      enrollmentId: null as string | null,
    };
  }

  const row = paymentIntent as PaymentIntentRow;
  const enrollmentId =
    typeof row.payload?.enrollment_id === 'string' ? row.payload.enrollment_id : null;

  return {
    paymentState: resolvePaymentState(row.status),
    enrollmentId,
  };
}

export default async function CourseEnrollmentSuccessPage({
  searchParams,
}: CourseEnrollmentSuccessPageProps) {
  const params = await searchParams;
  const routeContext = await getPublicTenantRouteContext();
  const result = await resolveEnrollmentResult(params);

  const eyebrow =
    result.paymentState === 'approved'
      ? 'Pago aprobado'
      : result.paymentState === 'pending'
        ? 'Pago pendiente'
        : 'Pago no completado';
  const title =
    result.paymentState === 'approved'
      ? result.enrollmentId
        ? 'Inscripcion confirmada'
        : 'Pago aprobado'
      : result.paymentState === 'pending'
        ? 'Estamos esperando confirmacion'
        : 'No pudimos confirmar tu inscripcion';
  const description =
    result.paymentState === 'approved'
      ? result.enrollmentId
        ? 'Tu cupo fue registrado correctamente.'
        : 'El pago fue aprobado. Estamos registrando tu cupo.'
      : result.paymentState === 'pending'
        ? 'Mercado Pago aun no confirmo el cobro. Te avisamos cuando termine el proceso.'
        : 'Puedes volver al curso para intentar de nuevo.';
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

  const shopSlug = String(params.shop || '').trim();
  const courseId = String(params.course || '').trim();
  const titleLabel = String(params.title || '').trim() || 'Curso';
  const fallbackHref =
    shopSlug && courseId
      ? buildTenantCourseHref(shopSlug, courseId, routeContext.mode)
      : shopSlug
        ? buildTenantPublicHref(shopSlug, routeContext.mode, 'courses')
        : '/courses';

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
              <dt className="text-xs uppercase tracking-[0.12em] text-slate/65">Curso</dt>
              <dd className="mt-1 font-medium text-ink dark:text-slate-100">{titleLabel}</dd>
            </div>
            <div className="surface-card">
              <dt className="text-xs uppercase tracking-[0.12em] text-slate/65">Inscripcion</dt>
              <dd className="mt-1 font-medium text-ink dark:text-slate-100">
                {result.enrollmentId || 'Pendiente'}
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button as="a" href={fallbackHref} className="action-primary px-5 text-sm font-semibold">
              {result.paymentState === 'failure' ? 'Reintentar pago' : 'Volver al curso'}
            </Button>
            <Button
              as="a"
              href={shopSlug ? buildTenantPublicHref(shopSlug, routeContext.mode, 'courses') : '/courses'}
              variant="ghost"
              className="action-secondary px-5 text-sm font-semibold"
            >
              Ver mas cursos
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
