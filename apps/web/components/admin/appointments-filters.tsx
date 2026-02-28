'use client';

import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { Select, SelectItem } from '@heroui/select';

interface StaffOption {
  id: string;
  name: string;
}

interface AdminAppointmentsFiltersProps {
  from: string;
  to: string;
  selectedStaffId?: string | undefined;
  selectedStatus?: string | undefined;
  staff: StaffOption[];
}

export function AdminAppointmentsFilters({
  from,
  to,
  selectedStaffId,
  selectedStatus,
  staff,
}: AdminAppointmentsFiltersProps) {
  const staffOptions = [{ id: 'all', name: 'Todo el equipo' }, ...staff];
  const statusOptions = [
    { id: 'all', label: 'Todos' },
    { id: 'pending', label: 'Pendiente' },
    { id: 'confirmed', label: 'Confirmada' },
    { id: 'cancelled', label: 'Cancelada' },
    { id: 'no_show', label: 'No asistio' },
    { id: 'done', label: 'Realizada' },
  ];

  return (
    <form
      className="spotlight-card soft-panel grid gap-3 rounded-[1.8rem] border-0 p-4 md:grid-cols-5"
      method="get"
    >
      <Input
        id="from"
        name="from"
        type="date"
        label="Desde"
        labelPlacement="inside"
        defaultValue={from}
        classNames={{
          input: 'temporal-placeholder-hidden',
        }}
      />

      <Input
        id="to"
        name="to"
        type="date"
        label="Hasta"
        labelPlacement="inside"
        defaultValue={to}
        classNames={{
          input: 'temporal-placeholder-hidden',
        }}
      />

      <Select
        id="staff"
        name="staff_id"
        aria-label="Filtrar por equipo"
        label="Equipo"
        labelPlacement="inside"
        defaultSelectedKeys={[selectedStaffId || 'all']}
      >
        {staffOptions.map((item) => (
          <SelectItem key={item.id}>{item.name}</SelectItem>
        ))}
      </Select>

      <Select
        id="status"
        name="status"
        aria-label="Filtrar por estado"
        label="Estado"
        labelPlacement="inside"
        defaultSelectedKeys={[selectedStatus || 'all']}
      >
        {statusOptions.map((item) => (
          <SelectItem key={item.id}>{item.label}</SelectItem>
        ))}
      </Select>

      <div className="flex items-end">
        <Button
          type="submit"
          className="action-primary h-14 min-h-[56px] w-full px-4 text-sm font-semibold leading-none"
        >
          Aplicar filtros
        </Button>
      </div>
    </form>
  );
}
