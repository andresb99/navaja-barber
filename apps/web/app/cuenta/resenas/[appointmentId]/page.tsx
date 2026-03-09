import Link from 'next/link';
import { Card, CardBody } from '@heroui/card';
import { requireAuthenticated } from '@/lib/auth';
import { getAppointmentReviewAccessForUser } from '@/lib/account-reviews';
import { AccountAppointmentReviewForm } from '@/components/public/account-appointment-review-form';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

interface CuentaAppointmentReviewPageProps {
  params: Promise<{ appointmentId: string }>;
}

export default async function CuentaAppointmentReviewPage({ params }: CuentaAppointmentReviewPageProps) {
  const ctx = await requireAuthenticated('/cuenta');
  const { appointmentId } = await params;

  if (ctx.role !== 'user' || !ctx.userId) {
    return (
      <section className="space-y-6">
        <Card>
          <CardBody className="space-y-2">
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink">Reseñas</h1>
            <p className="text-sm text-slate/80">Esta vista está disponible solo para clientes.</p>
          </CardBody>
        </Card>
      </section>
    );
  }

  const access = await getAppointmentReviewAccessForUser(ctx.userId, appointmentId);

  if (!access) {
    return (
      <section className="space-y-6">
        <Card>
          <CardBody className="space-y-2">
            <Link href="/cuenta" className="text-sm text-ink underline">
              Volver a mi cuenta
            </Link>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink">Cita no encontrada</h1>
            <p className="text-sm text-slate/80">No encontramos esa cita dentro de tu historial.</p>
          </CardBody>
        </Card>
      </section>
    );
  }

  if (ctx.userId) {
    const admin = createSupabaseAdminClient();
    await admin
      .from('account_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', ctx.userId)
      .eq('appointment_id', access.appointment.id)
      .eq('notification_type', 'review_requested')
      .eq('is_read', false);
  }

  return (
    <section className="space-y-6">
      <Card>
        <CardBody className="space-y-4">
          <div className="space-y-2">
            <Link href="/cuenta" className="text-sm text-ink underline">
              Volver a mi cuenta
            </Link>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink">
              Calificar cita
            </h1>
            <p className="text-sm text-slate/80">
              {access.appointment.serviceName} con {access.appointment.staffName}
            </p>
            <p className="text-xs text-slate/70">
              {new Date(access.appointment.startAt).toLocaleString('es-UY', { timeZone: 'UTC' })}
            </p>
          </div>

          {access.canReview ? (
            <AccountAppointmentReviewForm appointmentId={access.appointment.id} />
          ) : access.existingReview ? (
            <div className="space-y-2 rounded-2xl bg-slate/5 px-4 py-4 text-sm">
              <p className="font-semibold text-ink dark:text-slate-100">
                Ya calificaste esta cita: {access.existingReview.rating} / 5
              </p>
              {access.existingReview.comment ? <p className="text-slate/80">{access.existingReview.comment}</p> : null}
            </div>
          ) : (
            <p className="text-sm text-slate/80">
              Esta cita todavía no está disponible para calificación.
            </p>
          )}
        </CardBody>
      </Card>
    </section>
  );
}
