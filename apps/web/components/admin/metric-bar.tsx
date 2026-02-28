interface MetricBarProps {
  value: number;
  max: number;
  tone?: 'ink' | 'brass' | 'rose';
}

const toneClassName: Record<NonNullable<MetricBarProps['tone']>, string> = {
  ink: 'from-sky-500 via-cyan-400 to-blue-500',
  brass: 'from-amber-400 via-orange-300 to-yellow-300',
  rose: 'from-rose-500 via-pink-500 to-orange-400',
};

export function MetricBar({ value, max, tone = 'ink' }: MetricBarProps) {
  const safeMax = Math.max(1, max);
  const ratio = Math.max(0, Math.min(1, value / safeMax));
  const ratioPercent = Math.round(ratio * 100);

  return (
    <div className="relative h-2 rounded-full bg-slate/10 dark:bg-white/[0.06]">
      <div
        className={`h-2 rounded-full bg-gradient-to-r ${toneClassName[tone]} shadow-[0_0_18px_rgba(56,189,248,0.22)]`}
        style={{ width: `${ratioPercent}%` }}
      />
      <div
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 bg-white shadow-[0_8px_18px_-10px_rgba(56,189,248,0.55)] dark:border-transparent dark:bg-slate-100"
        style={{ left: `${ratioPercent}%` }}
      />
    </div>
  );
}
