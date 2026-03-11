'use client';

import { Button } from '@heroui/button';
import { Textarea } from '@heroui/input';
import { SelectItem } from '@heroui/select';
import { updateJobApplicationAction } from '@/app/admin/actions';
import { AdminSelect } from '@/components/heroui/admin-select';

interface ApplicantUpdateFormProps {
  applicationId: string;
  shopId: string;
  status: string;
  notes: string;
}

export function ApplicantUpdateForm({
  applicationId,
  shopId,
  status,
  notes,
}: ApplicantUpdateFormProps) {
  return (
    <form action={updateJobApplicationAction} className="mt-4 space-y-2">
      <input type="hidden" name="application_id" value={applicationId} />
      <input type="hidden" name="shop_id" value={shopId} />
      <AdminSelect
        name="status"
        aria-label="Estado de postulacion"
        label="Estado"
        labelPlacement="inside"
        defaultSelectedKeys={[status]}
      >
        <SelectItem key="new">Nuevo</SelectItem>
        <SelectItem key="contacted">Contactado</SelectItem>
        <SelectItem key="interview">Entrevista</SelectItem>
        <SelectItem key="rejected">Rechazado</SelectItem>
        <SelectItem key="hired">Contratado</SelectItem>
      </AdminSelect>
      <Textarea
        name="notes"
        rows={3}
        label="Notas internas"
        labelPlacement="inside"
        defaultValue={notes}
      />
      <Button
        type="submit"
        variant="flat"
        color="default"
        className="action-secondary px-5 text-sm font-semibold"
      >
        Actualizar postulacion
      </Button>
    </form>
  );
}
