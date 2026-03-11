'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { Button } from '@heroui/button';
import { SelectItem } from '@heroui/select';
import { markAppointmentCompletedAction, updateAppointmentStatusAction } from '@/app/admin/actions';
import { AdminSelect } from '@/components/heroui/admin-select';

interface AdminAppointmentStatusFormProps {
  appointmentId: string;
  status: string;
  shopId: string;
  compact?: boolean;
}

const compactSubmitClass =
  'action-secondary h-10 min-h-[40px] w-full rounded-xl px-3 text-xs font-semibold leading-none';

const defaultSubmitClass =
  'action-secondary h-14 min-h-[56px] px-4 text-xs font-semibold leading-none';

export function AdminAppointmentStatusForm({
  appointmentId,
  status,
  shopId,
  compact = false,
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
          const result = await markAppointmentCompletedAction({ appointmentId, shopId });
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
    <form onSubmit={handleSubmit} className={compact ? 'w-full space-y-3' : 'space-y-2'}>
      <div className={compact ? 'grid w-full gap-2' : 'flex flex-wrap items-stretch gap-2'}>
        <input type="hidden" name="appointment_id" value={appointmentId} />
        <input type="hidden" name="shop_id" value={shopId} />
        <AdminSelect
          name="status"
          aria-label="Actualizar estado"
          label="Estado"
          labelPlacement={compact ? 'outside' : 'inside'}
          defaultSelectedKeys={[status]}
          size={compact ? 'sm' : 'md'}
          uiVariant={compact ? 'compact' : 'default'}
          className={compact ? 'w-full min-w-[15rem]' : 'w-48 shrink-0'}
        >
          <SelectItem key="confirmed">Confirmada</SelectItem>
          <SelectItem key="cancelled">Cancelada</SelectItem>
          <SelectItem key="no_show">No asistio</SelectItem>
          <SelectItem key="done">Realizada</SelectItem>
        </AdminSelect>
        <Button
          type="submit"
          variant="flat"
          color="default"
          isLoading={isPending}
          className={compact ? compactSubmitClass : defaultSubmitClass}
        >
          Guardar
        </Button>
      </div>

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}

      {reviewLink ? (
        <a href={reviewLink} className="text-xs font-medium text-ink underline dark:text-slate-200">
          Abrir enlace de resena
        </a>
      ) : null}
    </form>
  );
}
