'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@heroui/button';
import { AdminAppointmentsCards } from '@/components/admin/appointments-cards';
import { AdminAppointmentsTable } from '@/components/admin/appointments-table';

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
}

export function AdminAppointmentsViewSwitcher({
  shopId,
  appointments,
  initialView = 'table',
}: AdminAppointmentsViewSwitcherProps) {
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
        setViewMode(nextView);
        setIsVisible(true);
        switchTimeoutRef.current = null;
      }, 140);
    },
    [clearSwitchTimeout, viewMode],
  );

  useEffect(() => clearSwitchTimeout, [clearSwitchTimeout]);

  return (
    <>
      <div className="hidden md:flex md:justify-end">
        <div className="inline-flex items-center gap-1 rounded-full border border-slate-900/10 bg-white/70 p-1 dark:border-white/10 dark:bg-white/[0.04]">
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

      <div className="md:hidden">
        <AdminAppointmentsCards shopId={shopId} appointments={appointments} />
      </div>

      <div className="hidden md:block">
        <div
          className={`transform-gpu transition-[opacity,transform,filter] duration-200 ease-out ${
            isVisible ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-1 opacity-0 blur-[1px]'
          }`}
        >
          {viewMode === 'cards' ? (
            <AdminAppointmentsCards shopId={shopId} appointments={appointments} />
          ) : (
            <AdminAppointmentsTable shopId={shopId} appointments={appointments} />
          )}
        </div>
      </div>
    </>
  );
}
