'use client';

import type { FormEvent } from 'react';
import { useCallback, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { SelectItem } from '@heroui/select';
import {
  ADMIN_APPOINTMENTS_PAGE_SIZE_OPTIONS,
  ADMIN_APPOINTMENTS_SORT_OPTIONS,
  buildAdminAppointmentsQueryString,
  type AdminAppointmentsQueryState,
  type AdminAppointmentsSortDir,
  type AdminAppointmentsSortField,
} from '@/lib/admin-appointments';
import { AdminSelect } from '@/components/heroui/admin-select';

interface StaffOption {
  id: string;
  name: string;
}

interface AdminAppointmentsFiltersProps {
  shopSlug: string;
  from: string;
  to: string;
  selectedView?: 'table' | 'cards';
  selectedStaffId?: string | undefined;
  selectedStatus?: string | undefined;
  selectedPageSize: number;
  selectedSortBy: AdminAppointmentsSortField;
  selectedSortDir: AdminAppointmentsSortDir;
  staff: StaffOption[];
}

export function AdminAppointmentsFilters({
  shopSlug,
  from,
  to,
  selectedView,
  selectedStaffId,
  selectedStatus,
  selectedPageSize,
  selectedSortBy,
  selectedSortDir,
  staff,
}: AdminAppointmentsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const staffOptions = [{ id: 'all', name: 'Todo el equipo' }, ...staff];
  const statusOptions = [
    { id: 'all', label: 'Todos' },
    { id: 'pending', label: 'Pendiente' },
    { id: 'confirmed', label: 'Confirmada' },
    { id: 'cancelled', label: 'Cancelada' },
    { id: 'no_show', label: 'No asistio' },
    { id: 'done', label: 'Realizada' },
  ];
  const formKey = [
    shopSlug,
    from,
    to,
    selectedView || 'table',
    selectedStaffId || 'all',
    selectedStatus || 'all',
    selectedPageSize,
    selectedSortBy,
    selectedSortDir,
  ].join('|');
  const inputClassNames = {
    label:
      'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-500',
    inputWrapper:
      'min-h-[56px] rounded-[1.2rem] border border-slate-900/10 bg-white/82 shadow-none transition data-[hover=true]:border-sky-300 group-data-[focus=true]:border-sky-400 dark:border-white/10 dark:bg-white/[0.04]',
    input: 'text-sm text-slate-900 dark:text-zinc-100',
  } as const;
  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const formData = new FormData(event.currentTarget);
      const staffIdValue = String(formData.get('staff_id') || 'all');
      const statusValue = String(formData.get('status') || 'all');
      const nextQueryState: AdminAppointmentsQueryState = {
        shopSlug,
        from: String(formData.get('from') || from),
        to: String(formData.get('to') || to),
        selectedView:
          String(formData.get('view') || selectedView || 'table') === 'cards' ? 'cards' : 'table',
        page: 1,
        pageSize:
          Number.parseInt(String(formData.get('page_size') || selectedPageSize), 10) ||
          selectedPageSize,
        sortBy: String(formData.get('sort_by') || selectedSortBy) as AdminAppointmentsSortField,
        sortDir: String(formData.get('sort_dir') || selectedSortDir) as AdminAppointmentsSortDir,
        ...(staffIdValue !== 'all' ? { selectedStaffId: staffIdValue } : {}),
        ...(statusValue !== 'all' ? { selectedStatus: statusValue } : {}),
      };

      startTransition(() => {
        router.replace(`${pathname}?${buildAdminAppointmentsQueryString(nextQueryState)}`, {
          scroll: false,
        });
      });
    },
    [
      from,
      pathname,
      router,
      selectedPageSize,
      selectedSortBy,
      selectedSortDir,
      selectedStatus,
      selectedStaffId,
      selectedView,
      shopSlug,
      to,
    ],
  );

  return (
    <form
      key={formKey}
      className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      method="get"
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="shop" value={shopSlug} />
      <input type="hidden" name="page" value="1" />
      {selectedView === 'cards' ? <input type="hidden" name="view" value="cards" /> : null}
      <Input
        id="from"
        name="from"
        type="date"
        label="Desde"
        labelPlacement="inside"
        defaultValue={from}
        classNames={{
          ...inputClassNames,
          input: 'temporal-placeholder-hidden text-sm text-slate-900 dark:text-zinc-100',
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
          ...inputClassNames,
          input: 'temporal-placeholder-hidden text-sm text-slate-900 dark:text-zinc-100',
        }}
      />

      <AdminSelect
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
      </AdminSelect>

      <AdminSelect
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
      </AdminSelect>

      <AdminSelect
        id="sort_by"
        name="sort_by"
        aria-label="Ordenar por"
        label="Ordenar por"
        labelPlacement="inside"
        defaultSelectedKeys={[selectedSortBy]}
      >
        {ADMIN_APPOINTMENTS_SORT_OPTIONS.map((item) => (
          <SelectItem key={item.id}>{item.label}</SelectItem>
        ))}
      </AdminSelect>

      <AdminSelect
        id="sort_dir"
        name="sort_dir"
        aria-label="Direccion del orden"
        label="Direccion"
        labelPlacement="inside"
        defaultSelectedKeys={[selectedSortDir]}
      >
        <SelectItem key="asc">Menor a mayor</SelectItem>
        <SelectItem key="desc">Mayor a menor</SelectItem>
      </AdminSelect>

      <AdminSelect
        id="page_size"
        name="page_size"
        aria-label="Cantidad por pagina"
        label="Por pagina"
        labelPlacement="inside"
        defaultSelectedKeys={[String(selectedPageSize)]}
      >
        {ADMIN_APPOINTMENTS_PAGE_SIZE_OPTIONS.map((value) => (
          <SelectItem key={String(value)}>{`${value} por pagina`}</SelectItem>
        ))}
      </AdminSelect>

      <div className="flex items-end md:col-span-2 xl:col-span-4 xl:justify-end">
        <Button
          type="submit"
          isLoading={isPending}
          className="action-primary h-12 min-h-[48px] w-full px-4 text-sm font-semibold leading-none sm:w-auto sm:min-w-[12rem]"
        >
          Aplicar filtros
        </Button>
      </div>
    </form>
  );
}
