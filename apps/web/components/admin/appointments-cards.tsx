'use client';

import { memo } from 'react';
import {
  Avatar,
  Button,
  Chip,
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
      <div className={`surface-card rounded-[1.6rem] p-5 text-sm text-slate-700 dark:text-zinc-300 ${className || ''}`.trim()}>
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
          <article key={item.id} className="surface-card rounded-[1.6rem] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500">
                  {item.startAtLabel}
                </p>
                <div className="mt-3 flex min-w-0 items-center gap-3">
                  <Avatar
                    name={item.customerName}
                    size="sm"
                    className="h-10 w-10 shrink-0 bg-slate-900/85 text-white dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-zinc-100">
                      {item.customerName}
                    </p>
                    <p className="truncate text-xs text-slate-600 dark:text-zinc-400">
                      {item.customerPhone || 'Sin telefono'}
                    </p>
                  </div>
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

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-[1.15rem] border border-slate-900/8 bg-white/58 px-3 py-3 dark:border-white/8 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-500">
                  Servicio
                </p>
                <p className="mt-1 text-sm text-slate-900 dark:text-zinc-100">{item.serviceName}</p>
              </div>
              <div className="rounded-[1.15rem] border border-slate-900/8 bg-white/58 px-3 py-3 dark:border-white/8 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-500">
                  Barbero
                </p>
                <p className="mt-1 text-sm text-slate-900 dark:text-zinc-100">{item.staffName}</p>
              </div>
              <div className="rounded-[1.15rem] border border-slate-900/8 bg-white/58 px-3 py-3 dark:border-white/8 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-500">
                  Canal
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">{item.sourceChannelLabel}</p>
              </div>
              <div className="rounded-[1.15rem] border border-slate-900/8 bg-white/58 px-3 py-3 dark:border-white/8 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-500">
                  Precio
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-zinc-100">{item.priceLabel}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-slate-900/8 bg-white/58 px-3 py-3 dark:border-white/8 dark:bg-white/[0.03]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-500">
                  Pago
                </p>
                <div className="mt-2">
                  <Chip size="sm" radius="full" variant="flat" color={paymentTone}>
                    {paymentLabel}
                  </Chip>
                </div>
              </div>

              <div className="flex items-center gap-2">
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
