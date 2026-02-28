import { Card, CardBody } from '@heroui/card';

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
}

export function KpiCard({ label, value, hint }: KpiCardProps) {
  return (
    <Card className="data-card overflow-hidden rounded-[1.6rem] border-0 shadow-none">
      <CardBody className="relative p-5">
        <p className="relative z-10 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate/55 dark:text-slate-400">
          {label}
        </p>
        <p className="relative z-10 mt-4 text-3xl font-semibold tracking-tight text-ink dark:text-slate-100">
          {value}
        </p>
        {hint ? (
          <p className="relative z-10 mt-2 text-xs text-slate/70 dark:text-slate-400">{hint}</p>
        ) : null}
      </CardBody>
    </Card>
  );
}
