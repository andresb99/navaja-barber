'use client';

import { memo } from 'react';
import {
  Avatar,
  Button,
  Chip,
  Divider,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@heroui/react';
import { Pencil, Phone } from 'lucide-react';
import { AdminAppointmentStatusForm } from '@/components/admin/appointment-status-form';
import {
  ADMIN_DARK_TABLE_POPOVER_CONTENT,
  ADMIN_DARK_TABLE_POPOVER_TITLE,
} from '@/lib/ui/admin-table-tokens';

interface AppointmentCardRow {
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

interface AdminAppointmentsCardsProps {
  shopId: string;
  appointments: AppointmentCardRow[];
  className?: string;
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

export const AdminAppointmentsCards = memo(function AdminAppointmentsCards({
  shopId,
  appointments,
  className,
}: AdminAppointmentsCardsProps) {
  if (!appointments.length) {
    return (
      <div
        className={`rounded-[1.6rem] border border-slate-900/10 bg-white/80 p-5 text-sm text-slate-700 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300 ${className || ''}`.trim()}
      >
        No hay citas para los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className={`grid gap-3 md:grid-cols-2 xl:grid-cols-3 ${className || ''}`.trim()}>
      {appointments.map((item) => {
        const phoneHref = getPhoneHref(item.customerPhone);
        const normalizedPaymentStatus = String(item.paymentStatus || '').trim().toLowerCase();
        const paymentLabel = normalizedPaymentStatus
          ? paymentStatusLabel[normalizedPaymentStatus] || normalizedPaymentStatus
          : 'Sin pago online';
        const paymentTone = normalizedPaymentStatus
          ? paymentStatusTone[normalizedPaymentStatus] || 'default'
          : 'default';

        return (
          <article
            key={item.id}
            className="rounded-[1.6rem] border border-slate-900/10 bg-white/80 p-4 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-white/[0.03]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  name={item.customerName}
                  size="sm"
                  className="h-10 w-10 shrink-0 bg-slate-900/85 text-white dark:bg-zinc-800 dark:text-zinc-100"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-zinc-100">
                    {item.customerName}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-zinc-400">{item.customerPhone || 'Sin telefono'}</p>
                </div>
              </div>

              <Chip
                size="sm"
                radius="full"
                variant="flat"
                color={statusTone[item.status] || 'default'}
                className="capitalize"
              >
                {statusLabel[item.status] || item.status}
              </Chip>
            </div>

            <Divider className="my-3 bg-slate-900/10 dark:bg-white/10" />

            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-500">
                  Turno
                </dt>
                <dd className="text-slate-800 dark:text-zinc-200">{item.startAtLabel}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-500">
                  Servicio
                </dt>
                <dd className="text-slate-800 dark:text-zinc-200">{item.serviceName}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-500">
                  Barbero
                </dt>
                <dd className="text-slate-700 dark:text-zinc-300">{item.staffName}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-500">
                  Canal
                </dt>
                <dd className="text-slate-700 dark:text-zinc-300">{item.sourceChannelLabel}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-500">
                  Precio
                </dt>
                <dd className="text-slate-900 dark:text-zinc-100">{item.priceLabel}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-500">
                  Pago
                </dt>
                <dd>
                  <Chip size="sm" radius="full" variant="flat" color={paymentTone}>
                    {paymentLabel}
                  </Chip>
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex items-center gap-2">
              {phoneHref ? (
                <Button
                  as="a"
                  href={phoneHref}
                  size="sm"
                  variant="flat"
                  startContent={<Phone className="h-4 w-4" />}
                  className="text-slate-700 dark:text-zinc-200"
                >
                  Llamar
                </Button>
              ) : (
                <Button size="sm" variant="flat" isDisabled>
                  Sin telefono
                </Button>
              )}

              <Popover placement="bottom-end" showArrow offset={12}>
                <PopoverTrigger>
                  <Button
                    size="sm"
                    variant="flat"
                    startContent={<Pencil className="h-4 w-4" />}
                    className="text-slate-700 dark:text-zinc-200"
                  >
                    Editar
                  </Button>
                </PopoverTrigger>
                <PopoverContent className={ADMIN_DARK_TABLE_POPOVER_CONTENT}>
                  <p className={ADMIN_DARK_TABLE_POPOVER_TITLE}>Actualizar estado</p>
                  <AdminAppointmentStatusForm
                    appointmentId={item.id}
                    status={item.status}
                    shopId={shopId}
                    compact
                  />
                </PopoverContent>
              </Popover>
            </div>
          </article>
        );
      })}
    </div>
  );
}, (prevProps, nextProps) =>
  prevProps.shopId === nextProps.shopId &&
  prevProps.className === nextProps.className &&
  prevProps.appointments === nextProps.appointments,
);

