'use client';

import { Button } from '@heroui/button';
import { Select, SelectItem } from '@heroui/select';
import { updateOwnAppointmentStatusAction } from '@/app/admin/actions';

interface StaffAppointmentStatusFormProps {
  appointmentId: string;
  status: string;
}

export function StaffAppointmentStatusForm({ appointmentId, status }: StaffAppointmentStatusFormProps) {
  return (
    <form action={updateOwnAppointmentStatusAction} className="mt-3 flex flex-wrap items-center gap-2">
      <input type="hidden" name="appointment_id" value={appointmentId} />
      <Select
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
      </Select>
      <Button type="submit" variant="flat" color="default">
        Guardar estado
      </Button>
    </form>
  );
}
