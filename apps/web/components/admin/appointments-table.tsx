'use client';

import { type Key, useCallback } from 'react';
import {
  Button,
  Chip,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tooltip,
  User,
} from '@heroui/react';
import { Pencil, Phone } from 'lucide-react';
import { AdminAppointmentStatusForm } from '@/components/admin/appointment-status-form';
import {
  ADMIN_DARK_TABLE_ACTION_ICON_BUTTON,
  ADMIN_DARK_TABLE_CELL,
  ADMIN_DARK_TABLE_HEAD,
  ADMIN_DARK_TABLE_LAYOUT,
  ADMIN_DARK_TABLE_POPOVER_CONTENT,
  ADMIN_DARK_TABLE_POPOVER_TITLE,
  ADMIN_DARK_TABLE_ROW,
  ADMIN_DARK_TABLE_SHELL_BASE,
} from '@/lib/ui/admin-table-tokens';

interface AppointmentRow {
  id: string;
  startAtLabel: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  staffName: string;
  sourceChannelLabel: string;
  status: string;
  paymentStatus: string | null;
  priceLabel: string;
}

interface AdminAppointmentsTableProps {
  shopId: string;
  appointments: AppointmentRow[];
}

type ColumnKey =
  | 'appointment'
  | 'customer'
  | 'service'
  | 'staff'
  | 'channel'
  | 'status'
  | 'payment'
  | 'price'
  | 'actions';

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

const paymentStatusTone: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  processing: 'warning',
  approved: 'success',
  refunded: 'default',
  rejected: 'danger',
  cancelled: 'danger',
  expired: 'danger',
};

const paymentStatusLabel: Record<string, string> = {
  pending: 'Pendiente',
  processing: 'Procesando',
  approved: 'Aprobado',
  refunded: 'Devuelto',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
  expired: 'Expirado',
};

function getPhoneHref(phone: string) {
  const normalized = phone.replace(/[^\d+]/g, '');
  return normalized ? `tel:${normalized}` : null;
}

export function AdminAppointmentsTable({ shopId, appointments }: AdminAppointmentsTableProps) {
  const renderCell = useCallback(
    (item: AppointmentRow, columnKey: Key) => {
      const key = String(columnKey) as ColumnKey;

      switch (key) {
        case 'appointment':
          return (
            <div className="flex flex-col">
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{item.startAtLabel}</p>
              <p className="text-xs text-slate-600 dark:text-zinc-400">Turno</p>
            </div>
          );
        case 'customer':
          return (
            <User
              name={item.customerName}
              description={item.customerPhone || 'Sin telefono'}
              avatarProps={{
                radius: 'full',
                name: item.customerName,
                className: 'bg-slate-900/85 text-white dark:bg-zinc-800 dark:text-zinc-100',
              }}
              classNames={{
                base: 'max-w-full',
                name: 'text-sm text-slate-900 dark:text-zinc-100',
                description: 'text-xs text-slate-600 dark:text-zinc-400',
              }}
            />
          );
        case 'service':
          return (
            <div className="flex flex-col">
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{item.serviceName}</p>
              <p className="text-xs text-slate-600 dark:text-zinc-400">Servicio</p>
            </div>
          );
        case 'staff':
          return (
            <div className="flex flex-col">
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{item.staffName}</p>
              <p className="text-xs text-slate-600 dark:text-zinc-400">Asignado</p>
            </div>
          );
        case 'channel':
          return (
            <div className="flex flex-col">
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                {item.sourceChannelLabel}
              </p>
              <p className="text-xs text-slate-600 dark:text-zinc-400">Canal</p>
            </div>
          );
        case 'status':
          return (
            <Chip
              size="sm"
              radius="full"
              variant="flat"
              color={statusTone[item.status] || 'default'}
              className="capitalize"
            >
              {statusLabel[item.status] || item.status}
            </Chip>
          );
        case 'payment': {
          const normalizedPaymentStatus = String(item.paymentStatus || '').trim().toLowerCase();
          const paymentLabel = normalizedPaymentStatus
            ? paymentStatusLabel[normalizedPaymentStatus] || normalizedPaymentStatus
            : 'Sin pago online';
          const paymentTone = normalizedPaymentStatus
            ? paymentStatusTone[normalizedPaymentStatus] || 'default'
            : 'default';

          return (
            <Chip size="sm" radius="full" variant="flat" color={paymentTone}>
              {paymentLabel}
            </Chip>
          );
        }
        case 'price':
          return <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{item.priceLabel}</p>;
        case 'actions': {
          const phoneHref = getPhoneHref(item.customerPhone);

          return (
            <div className="flex items-center justify-end gap-1">
              {phoneHref ? (
                <Tooltip content="Llamar cliente" placement="top">
                  <Button
                    as="a"
                    href={phoneHref}
                    isIconOnly
                    size="sm"
                    variant="light"
                    className={ADMIN_DARK_TABLE_ACTION_ICON_BUTTON}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                </Tooltip>
              ) : null}

              <Popover placement="bottom-end" showArrow offset={12}>
                <PopoverTrigger>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    aria-label={`Actualizar estado de ${item.customerName}`}
                    className={ADMIN_DARK_TABLE_ACTION_ICON_BUTTON}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className={ADMIN_DARK_TABLE_POPOVER_CONTENT}>
                  <p className={ADMIN_DARK_TABLE_POPOVER_TITLE}>
                    Actualizar estado
                  </p>
                  <AdminAppointmentStatusForm
                    appointmentId={item.id}
                    status={item.status}
                    shopId={shopId}
                    compact
                  />
                </PopoverContent>
              </Popover>
            </div>
          );
        }
        default:
          return null;
      }
    },
    [shopId],
  );

  return (
    <div
      className={`${ADMIN_DARK_TABLE_SHELL_BASE} admin-appointments-table overflow-y-visible rounded-[1.8rem] shadow-[0_30px_65px_-42px_rgba(2,6,23,0.95)]`}
    >
      <Table
        removeWrapper
        aria-label="Tabla de citas"
        classNames={{
          table: `min-w-[840px] ${ADMIN_DARK_TABLE_LAYOUT}`,
          th: ADMIN_DARK_TABLE_HEAD,
          td: ADMIN_DARK_TABLE_CELL,
        }}
      >
        <TableHeader>
          <TableColumn key="appointment">CITA</TableColumn>
          <TableColumn key="customer">CLIENTE</TableColumn>
          <TableColumn key="service">SERVICIO</TableColumn>
          <TableColumn key="staff">BARBERO</TableColumn>
          <TableColumn key="channel">CANAL</TableColumn>
          <TableColumn key="status">ESTADO</TableColumn>
          <TableColumn key="payment">PAGO</TableColumn>
          <TableColumn key="price">PRECIO</TableColumn>
          <TableColumn key="actions" align="end">
            ACCIONES
          </TableColumn>
        </TableHeader>
        <TableBody items={appointments} emptyContent="No hay citas para los filtros seleccionados.">
          {(item) => (
            <TableRow key={item.id} className={ADMIN_DARK_TABLE_ROW}>
              {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
