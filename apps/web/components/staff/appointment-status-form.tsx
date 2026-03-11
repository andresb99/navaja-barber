'use client';

import { Button } from '@heroui/button';
import { SelectItem } from '@heroui/select';
import { updateOwnAppointmentStatusAction } from '@/app/admin/actions';
import { AdminSelect } from '@/components/heroui/admin-select';

interface StaffAppointmentStatusFormProps {
  appointmentId: string;
  status: string;
  shopId: string;
}

export function StaffAppointmentStatusForm({
  appointmentId,
  status,
  shopId,
}: StaffAppointmentStatusFormProps) {
  return (
    <form
      action={updateOwnAppointmentStatusAction}
      className="mt-3 flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="appointment_id" value={appointmentId} />
      <input type="hidden" name="shop_id" value={shopId} />
      <AdminSelect
        name="status"
        aria-label="Estado de la cita"
        label="Estado"
        labelPlacement="inside"
        defaultSelectedKeys={[status]}
        className="w-48"
      >
        <SelectItem key="done">Realizada</SelectItem>
        <SelectItem key="no_show">No asistio</SelectItem>
        <SelectItem key="cancelled">Cancelada</SelectItem>
      </AdminSelect>
      <Button type="submit" variant="flat" color="default">
        Guardar estado
      </Button>
    </form>
  );
}
