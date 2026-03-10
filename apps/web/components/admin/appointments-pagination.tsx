'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Pagination } from '@heroui/react';
import {
  buildAdminAppointmentsQueryString,
  type AdminAppointmentsQueryState,
} from '@/lib/admin-appointments';

interface AdminAppointmentsPaginationProps {
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  queryState: AdminAppointmentsQueryState;
}

export function AdminAppointmentsPagination({
  totalItems,
  page,
  pageSize,
  totalPages,
  pageStart,
  pageEnd,
  queryState,
}: AdminAppointmentsPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();

  if (!totalItems) {
    return null;
  }

  const handlePageChange = useCallback(
    (nextPage: number) => {
      router.push(
        `${pathname}?${buildAdminAppointmentsQueryString(queryState, {
          page: nextPage,
        })}`,
        { scroll: false },
      );
    },
    [pathname, queryState, router],
  );

  return (
    <div className="surface-card flex flex-col gap-4 rounded-[1.6rem] px-4 py-4 md:px-5 md:py-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
          Paginacion
        </p>
        <p className="mt-2 text-sm text-slate-700 dark:text-zinc-300">
          Mostrando <span className="font-semibold text-slate-950 dark:text-zinc-100">{pageStart}</span>-
          <span className="font-semibold text-slate-950 dark:text-zinc-100">{pageEnd}</span> de{' '}
          <span className="font-semibold text-slate-950 dark:text-zinc-100">{totalItems}</span> citas /{' '}
          <span className="font-semibold text-slate-950 dark:text-zinc-100">{pageSize}</span> por pagina
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
        <span className="meta-chip">Pagina {page} de {totalPages}</span>

        <Pagination
          total={totalPages}
          page={page}
          onChange={handlePageChange}
          showControls
          siblings={1}
          boundaries={1}
          radius="full"
          size="sm"
          variant="flat"
          classNames={{
            wrapper: 'gap-1',
            item: 'border border-slate-900/10 bg-white/72 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200',
            cursor: 'border-transparent bg-sky-500 text-white shadow-none',
            prev: 'border border-slate-900/10 bg-white/72 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200',
            next: 'border border-slate-900/10 bg-white/72 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200',
          }}
        />
      </div>
    </div>
  );
}
