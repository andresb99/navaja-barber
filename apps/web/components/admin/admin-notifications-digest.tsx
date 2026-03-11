import Link from 'next/link';
import { Card, CardBody } from '@heroui/card';
import { Container } from '@/components/heroui/container';

interface AdminNotificationsDigestProps {
  shopSlug: string;
  totalCount: number;
  pendingTimeOffCount: number;
  pendingMembershipCount: number;
  stalePendingIntents: number;
}

export function AdminNotificationsDigest({
  shopSlug,
  totalCount,
  pendingTimeOffCount,
  pendingMembershipCount,
  stalePendingIntents,
}: AdminNotificationsDigestProps) {
  return (
    <Container as={Card} variant="section" className="rounded-[1.9rem]" shadow="none">
      <CardBody className="p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
              Notificaciones
            </p>
            <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
              Inbox separado de la home
            </h2>
            <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
              Las alertas operativas se manejan desde la campana y desde una vista dedicada, para
              que el resumen no vuelva a cargarse de ruido.
            </p>
          </div>
          <span className="meta-chip" data-tone={totalCount > 0 ? 'warning' : 'success'}>
            {totalCount > 0 ? `${totalCount} pendientes` : 'Todo al dia'}
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <article className="rounded-[1.35rem] border border-white/65 bg-white/52 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
              Ausencias
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
              {pendingTimeOffCount}
            </p>
          </article>
          <article className="rounded-[1.35rem] border border-white/65 bg-white/52 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
              Invitaciones
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
              {pendingMembershipCount}
            </p>
          </article>
          <article className="rounded-[1.35rem] border border-white/65 bg-white/52 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
              Pagos
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink dark:text-slate-100">
              {stalePendingIntents}
            </p>
          </article>
        </div>

        <Link
          href={`/admin/notifications?shop=${encodeURIComponent(shopSlug)}`}
          className="mt-5 inline-flex text-sm font-semibold text-ink underline underline-offset-2 dark:text-slate-100"
        >
          Abrir inbox de notificaciones
        </Link>
      </CardBody>
    </Container>
  );
}
