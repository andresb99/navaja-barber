'use client';
import { Card, CardBody } from '@heroui/card';

interface SparkKpiCardProps {
  label: string;
  value: string;
  badge: string;
  badgeTone?: 'success' | 'danger';
  sparkPoints: string;
}

export function SparkKpiCard({ label, value, badge, badgeTone = 'success', sparkPoints }: SparkKpiCardProps) {
  const isPositive = badgeTone === 'success';
  return (
    <Card className="overflow-hidden rounded-2xl border border-white/5 bg-[#141218] shadow-none">
      <CardBody className="relative p-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
            isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
          }`}>
            {badge}
          </span>
        </div>
        
        <p className="mt-4 text-3xl font-medium tracking-tight text-white">{value}</p>

        <div className="mt-6 h-8 w-full">
          <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-full w-full overflow-visible">
            <path
              d={sparkPoints}
              fill="none"
              stroke={isPositive ? '#a78bfa' : '#f43f5e'}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </CardBody>
    </Card>
  );
}
