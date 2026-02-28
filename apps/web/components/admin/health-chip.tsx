import type { StaffPerformanceMetric } from '@/lib/metrics';

interface HealthChipProps {
  metric: Pick<StaffPerformanceMetric, 'healthLabel' | 'healthTone'>;
}

const toneClassName: Record<string, string> = {
  success: 'meta-chip text-emerald-700 dark:text-emerald-200',
  warning: 'meta-chip text-amber-700 dark:text-amber-200',
  danger: 'meta-chip text-rose-700 dark:text-rose-200',
  primary: 'meta-chip border-sky-400/22 bg-sky-500/12 text-sky-700 dark:text-sky-200',
  default: 'meta-chip',
};

export function HealthChip({ metric }: HealthChipProps) {
  const tone =
    metric.healthTone === 'success'
      ? 'success'
      : metric.healthTone === 'warning'
        ? 'warning'
        : metric.healthTone === 'danger'
          ? 'danger'
          : undefined;

  return (
    <span className={toneClassName[metric.healthTone] || toneClassName.default} data-tone={tone}>
      {metric.healthLabel}
    </span>
  );
}
