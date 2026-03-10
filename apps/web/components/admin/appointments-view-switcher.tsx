'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@heroui/button';
import { AdminAppointmentsCards } from '@/components/admin/appointments-cards';
import { AdminAppointmentsTable } from '@/components/admin/appointments-table';
import {
  buildAdminAppointmentsQueryString,
  type AdminAppointmentsQueryState,
} from '@/lib/admin-appointments';

type ViewMode = 'table' | 'cards';

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

interface AdminAppointmentsViewSwitcherProps {
  shopId: string;
  appointments: AppointmentRow[];
  initialView?: ViewMode;
  queryState: AdminAppointmentsQueryState;
  totalAppointments: number;
  currentPageCount: number;
  pageLabel: string;
  activeFilterCount: number;
}

export function AdminAppointmentsViewSwitcher({
  shopId,
  appointments,
  initialView = 'table',
  queryState,
  totalAppointments,
  currentPageCount,
  pageLabel,
  activeFilterCount,
}: AdminAppointmentsViewSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [isVisible, setIsVisible] = useState(true);
  const switchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSwitchTimeout = useCallback(() => {
    if (!switchTimeoutRef.current) {
      return;
    }
    clearTimeout(switchTimeoutRef.current);
    switchTimeoutRef.current = null;
  }, []);

  const handleChangeView = useCallback(
    (nextView: ViewMode) => {
      if (nextView === viewMode) {
        return;
      }

      clearSwitchTimeout();
      setIsVisible(false);

      switchTimeoutRef.current = setTimeout(() => {
        const queryStateOverride =
          nextView === 'cards'
            ? ({ selectedView: 'cards' } as const)
            : {};

        setViewMode(nextView);
        setIsVisible(true);
        router.replace(
          `${pathname}?${buildAdminAppointmentsQueryString(queryState, queryStateOverride)}`,
          { scroll: false },
        );
        switchTimeoutRef.current = null;
      }, 140);
    },
    [clearSwitchTimeout, pathname, queryState, router, viewMode],
  );

  useEffect(() => {
    clearSwitchTimeout();
    setViewMode(initialView);
    setIsVisible(true);
  }, [clearSwitchTimeout, initialView]);

  useEffect(() => clearSwitchTimeout, [clearSwitchTimeout]);

  return (
    <section className="surface-card rounded-[1.8rem] p-5 md:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-900/8 pb-5 dark:border-white/8 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
            Resultados
          </p>
          <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
            Agenda filtrada
          </h2>
          <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
            {totalAppointments
              ? `Mostrando ${currentPageCount} de ${totalAppointments} citas. ${pageLabel}.`
              : 'No hay citas para los filtros seleccionados.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <span className="meta-chip">
            {activeFilterCount ? `${activeFilterCount} filtros activos` : 'Vista base'}
          </span>

          <div className="hidden md:inline-flex md:items-center md:gap-1 md:rounded-full md:border md:border-slate-900/10 md:bg-white/70 md:p-1 md:dark:border-white/10 md:dark:bg-white/[0.04]">
            <Button
              size="sm"
              radius="full"
              variant={viewMode === 'table' ? 'solid' : 'light'}
              color={viewMode === 'table' ? 'primary' : 'default'}
              className={viewMode === 'table' ? '' : 'text-slate-700 dark:text-zinc-300'}
              onPress={() => handleChangeView('table')}
            >
              Tabla
            </Button>
            <Button
              size="sm"
              radius="full"
              variant={viewMode === 'cards' ? 'solid' : 'light'}
              color={viewMode === 'cards' ? 'primary' : 'default'}
              className={viewMode === 'cards' ? '' : 'text-slate-700 dark:text-zinc-300'}
              onPress={() => handleChangeView('cards')}
            >
              Cards
            </Button>
          </div>
        </div>
      </div>

      <div className={viewMode === 'cards' ? 'mt-5' : 'mt-5 md:hidden'}>
        <div
          className={`transform-gpu transition-[opacity,transform,filter] duration-200 ease-out ${
            isVisible ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-1 opacity-0 blur-[1px]'
          }`}
        >
          <AdminAppointmentsCards shopId={shopId} appointments={appointments} />
        </div>
      </div>

      {viewMode !== 'cards' ? (
        <div className="mt-5 hidden md:block">
          <div
            className={`transform-gpu transition-[opacity,transform,filter] duration-200 ease-out ${
              isVisible
                ? 'translate-y-0 opacity-100 blur-0'
                : 'translate-y-1 opacity-0 blur-[1px]'
            }`}
          >
            <AdminAppointmentsTable
              shopId={shopId}
              appointments={appointments}
              queryState={queryState}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
