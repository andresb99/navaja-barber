import { Card, CardBody } from '@heroui/card';
import { CalendarClock, CheckCircle2, Star, type LucideIcon } from 'lucide-react';
import { Container } from '@/components/heroui/container';

interface SummaryCardItem {
  id: string;
  label: string;
  headline: string;
  detail: string;
  meta: string;
  icon: 'next' | 'completed' | 'review';
}

interface AdminHomeSummaryProps {
  shopName: string;
  rangeLabel: string;
  revenueLabel: string;
  activeAppointments: number;
  urgentItemsCount: number;
  summaryCards: SummaryCardItem[];
}

function resolveSummaryIcon(value: SummaryCardItem['icon']): LucideIcon {
  if (value === 'next') {
    return CalendarClock;
  }

  if (value === 'completed') {
    return CheckCircle2;
  }

  return Star;
}

function SummaryCard({ label, headline, detail, meta, icon }: SummaryCardItem) {
  const Icon = resolveSummaryIcon(icon);

  return (
    <article className="surface-card h-full rounded-[1.6rem] p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-[1.1rem] border border-white/70 bg-white/75 text-ink shadow-[0_18px_28px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100">
        <Icon className="h-5 w-5" />
      </div>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
        {label}
      </p>
      <h3 className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">{headline}</h3>
      <p className="mt-2 text-sm leading-7 text-slate/80 dark:text-slate-300">{detail}</p>
      <p className="mt-3 text-xs font-medium text-slate/65 dark:text-slate-400">{meta}</p>
    </article>
  );
}

export function AdminHomeSummary({
  shopName,
  rangeLabel,
  revenueLabel,
  activeAppointments,
  urgentItemsCount,
  summaryCards,
}: AdminHomeSummaryProps) {
  return (
    <>
      <Container variant="pageHeader" className="px-6 py-7 md:px-8 md:py-9">
        <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_320px] xl:items-end">
          <div>
            <p className="hero-eyebrow">Panel admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.35rem] dark:text-slate-100">
              Resumen corto del local
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate/80 dark:text-slate-300">
              {shopName} entra mejor por una home que resume lo ultimo y lo proximo del negocio, sin
              repetir botones que ya viven en la navegacion.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="meta-chip">{rangeLabel}</span>
              <span className="meta-chip">{activeAppointments} citas activas</span>
              <span className="meta-chip" data-tone={urgentItemsCount > 0 ? 'warning' : 'success'}>
                {urgentItemsCount ? `${urgentItemsCount} pendientes urgentes` : 'Sin urgencias'}
              </span>
            </div>
          </div>

          <div className="surface-card rounded-[1.8rem] p-4 md:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
              Ahora mismo
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-[1.25rem] border border-white/65 bg-white/52 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                  Facturacion estimada
                </p>
                <p className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
                  {revenueLabel}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[1.25rem] border border-white/65 bg-white/52 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                    Citas activas
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                    {activeAppointments}
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-white/65 bg-white/52 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                    Pendientes urgentes
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink dark:text-slate-100">
                    {urgentItemsCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>

      <Container as={Card} variant="section" className="rounded-[1.9rem]" shadow="none">
        <CardBody className="p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400">
                Resumen rapido
              </p>
              <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
                Lo ultimo y lo proximo, sin repetir el menu
              </h2>
              <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">
                La navegacion queda en el sidebar. La home solo conserva contexto util para abrir el
                dia rapido.
              </p>
            </div>
            <span className="meta-chip">3 senales clave</span>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-3">
            {summaryCards.map((item) => (
              <SummaryCard key={item.id} {...item} />
            ))}
          </div>
        </CardBody>
      </Container>
    </>
  );
}
