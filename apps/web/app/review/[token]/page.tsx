import { Card, CardBody } from '@heroui/card';
import { AppointmentReviewForm } from '@/components/public/appointment-review-form';
import { getReviewInvitePreview } from '@/lib/reviews';

interface AppointmentReviewPageProps {
  params: Promise<{ token: string }>;
}

export default async function AppointmentReviewPage({ params }: AppointmentReviewPageProps) {
  const { token } = await params;
  const invite = await getReviewInvitePreview(token);

  if (!invite) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-12">
        <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
          <CardBody className="space-y-2 p-5">
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink">
              Enlace invalido
            </h1>
            <p className="text-sm text-slate/80">
              Este enlace no esta disponible o ya fue utilizado.
            </p>
          </CardBody>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <Card className="soft-panel rounded-[1.9rem] border-0 shadow-none">
        <CardBody className="space-y-6 p-5">
          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-ink">
              Tu experiencia
            </h1>
            <p className="text-sm text-slate/80">
              {invite.serviceName} con {invite.staffName}
            </p>
            <p className="text-xs text-slate/70">
              Cita:{' '}
              {new Date(invite.appointmentStartAt).toLocaleString('es-UY', { timeZone: 'UTC' })}
            </p>
          </div>

          <AppointmentReviewForm signedToken={token} />
        </CardBody>
      </Card>
    </section>
  );
}
