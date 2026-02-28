'use client';

import { Chip } from '@heroui/chip';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/table';
import { AdminAppointmentStatusForm } from '@/components/admin/appointment-status-form';

interface AppointmentRow {
  id: string;
  startAtLabel: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  staffName: string;
  status: string;
  priceLabel: string;
}

interface AdminAppointmentsTableProps {
  appointments: AppointmentRow[];
}

const statusTone: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  confirmed: 'default',
  cancelled: 'danger',
  no_show: 'danger',
  done: 'success',
};

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  no_show: 'No asistio',
  done: 'Realizada',
};

export function AdminAppointmentsTable({ appointments }: AdminAppointmentsTableProps) {
  return (
    <div className="soft-panel overflow-auto rounded-[1.8rem] border-0 p-2">
      <Table
        removeWrapper
        aria-label="Tabla de citas"
        classNames={{
          table: 'min-w-full',
          th: 'bg-transparent text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60',
          td: 'align-middle border-b border-white/45 py-4 dark:border-white/6',
        }}
      >
        <TableHeader>
          <TableColumn>Inicio</TableColumn>
          <TableColumn>Cliente</TableColumn>
          <TableColumn>Servicio</TableColumn>
          <TableColumn>Barbero</TableColumn>
          <TableColumn>Estado</TableColumn>
          <TableColumn>Precio</TableColumn>
          <TableColumn>Actualizar</TableColumn>
        </TableHeader>
        <TableBody emptyContent="No hay citas para los filtros seleccionados.">
          {appointments.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.startAtLabel}</TableCell>
              <TableCell>
                <p>{item.customerName}</p>
                <p className="text-xs text-slate/70">{item.customerPhone}</p>
              </TableCell>
              <TableCell>{item.serviceName}</TableCell>
              <TableCell>{item.staffName}</TableCell>
              <TableCell>
                <Chip
                  size="sm"
                  radius="full"
                  variant="flat"
                  color={statusTone[item.status] || 'default'}
                >
                  {statusLabel[item.status] || item.status}
                </Chip>
              </TableCell>
              <TableCell>{item.priceLabel}</TableCell>
              <TableCell>
                <AdminAppointmentStatusForm appointmentId={item.id} status={item.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
