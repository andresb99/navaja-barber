'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { Button } from '@heroui/button';
import { Select, SelectItem } from '@heroui/select';
import { markAppointmentCompletedAction, updateAppointmentStatusAction } from '@/app/admin/actions';

interface AdminAppointmentStatusFormProps {
  appointmentId: string;
  status: string;
}

export function AdminAppointmentStatusForm({
  appointmentId,
  status,
}: AdminAppointmentStatusFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reviewLink, setReviewLink] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextStatus = String(formData.get('status') || '');

    startTransition(async () => {
      try {
        setError(null);

        if (nextStatus === 'done') {
          const result = await markAppointmentCompletedAction({ appointmentId });
          setReviewLink(result.reviewLink);
          return;
        }

        await updateAppointmentStatusAction(formData);
        setReviewLink(null);
      } catch (actionError) {
        setError(
          actionError instanceof Error ? actionError.message : 'No se pudo actualizar la cita.',
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex flex-wrap items-stretch gap-2">
        <input type="hidden" name="appointment_id" value={appointmentId} />
        <Select
          name="status"
          aria-label="Actualizar estado"
          label="Estado"
          labelPlacement="inside"
          defaultSelectedKeys={[status]}
          className="w-48 shrink-0"
        >
          <SelectItem key="confirmed">Confirmada</SelectItem>
          <SelectItem key="cancelled">Cancelada</SelectItem>
          <SelectItem key="no_show">No asistio</SelectItem>
          <SelectItem key="done">Realizada</SelectItem>
        </Select>
        <Button
          type="submit"
          variant="flat"
          color="default"
          isLoading={isPending}
          className="action-secondary h-14 min-h-[56px] px-4 text-xs font-semibold leading-none"
        >
          Guardar
        </Button>
      </div>

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}

      {reviewLink ? (
        <a href={reviewLink} className="text-xs font-medium text-ink underline">
          Abrir enlace de resena
        </a>
      ) : null}
    </form>
  );
}
