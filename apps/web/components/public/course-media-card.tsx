'use client';

import { memo, useMemo } from 'react';
import Link from 'next/link';
import { Avatar, Card, CardBody } from '@heroui/react';
import { ArrowUpRight } from 'lucide-react';

interface CourseMediaCardProps {
  title: string;
  description: string;
  topLabel: string;
  imageUrls: Array<string | null | undefined>;
  chips: string[];
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  avatarUrl?: string | null;
  avatarName?: string;
  metaRows?: Array<{ label: string; value: string }>;
  priceLabel?: string;
  subPriceLabel?: string;
}

function arraysEqualByStringValue(left: Array<string | null | undefined>, right: Array<string | null | undefined>) {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (String(left[index] || '') !== String(right[index] || '')) {
      return false;
    }
  }

  return true;
}

function metaRowsEqual(
  left: Array<{ label: string; value: string }> | undefined,
  right: Array<{ label: string; value: string }> | undefined,
) {
  const normalizedLeft = left || [];
  const normalizedRight = right || [];

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  for (let index = 0; index < normalizedLeft.length; index += 1) {
    if (
      normalizedLeft[index]?.label !== normalizedRight[index]?.label ||
      normalizedLeft[index]?.value !== normalizedRight[index]?.value
    ) {
      return false;
    }
  }

  return true;
}

function CourseMediaCardComponent({
  title,
  description,
  topLabel,
  chips,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  avatarUrl,
  avatarName,
  metaRows,
  priceLabel,
  subPriceLabel,
}: CourseMediaCardProps) {
  const compactRows = useMemo(
    () =>
      metaRows || chips.map((chip, index) => ({
        label: `Dato ${index + 1}`,
        value: chip,
      })),
    [chips, metaRows],
  );

  return (
    <Card className="data-card h-full min-h-[17rem] overflow-hidden rounded-[1.8rem] border-0 shadow-none">
      <CardBody className="flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center rounded-full border border-slate-900/10 bg-white/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">
            {topLabel}
          </span>
          {avatarName ? (
            <Avatar
              size="sm"
              {...(avatarUrl ? { src: avatarUrl } : {})}
              name={avatarName}
              className="h-9 w-9 border border-slate-900/10 bg-white/70 text-ink dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100"
            />
          ) : null}
        </div>

        <h2 className="mt-3 line-clamp-2 font-[family-name:var(--font-heading)] text-xl font-semibold leading-tight text-ink dark:text-slate-100">
          {title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm text-slate/80 dark:text-slate-300">{description}</p>

        <dl className="mt-4 grid gap-1.5 text-sm">
          {compactRows.map((row, index) => (
            <div key={`${row.label}-${row.value}-${index}`} className="flex items-baseline gap-1.5">
              <dt className="font-semibold text-ink dark:text-slate-100">{row.label}:</dt>
              <dd className="text-slate/85 dark:text-slate-300">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-auto pt-5">
          {priceLabel ? (
            <p className="text-4xl font-semibold leading-none tracking-[-0.02em] text-ink dark:text-slate-100">
              {priceLabel}
            </p>
          ) : null}
          {subPriceLabel ? (
            <p className="mt-2 text-sm text-slate/80 dark:text-slate-300">{subPriceLabel}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={primaryHref}
              className="action-primary inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-full px-4 py-2 text-sm font-semibold"
            >
              {primaryLabel}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            {secondaryHref && secondaryLabel ? (
              <Link
                href={secondaryHref}
                className="action-secondary inline-flex min-h-10 flex-1 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold"
              >
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export const CourseMediaCard = memo(CourseMediaCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.description === nextProps.description &&
    prevProps.topLabel === nextProps.topLabel &&
    prevProps.primaryHref === nextProps.primaryHref &&
    prevProps.primaryLabel === nextProps.primaryLabel &&
    prevProps.secondaryHref === nextProps.secondaryHref &&
    prevProps.secondaryLabel === nextProps.secondaryLabel &&
    prevProps.avatarUrl === nextProps.avatarUrl &&
    prevProps.avatarName === nextProps.avatarName &&
    prevProps.priceLabel === nextProps.priceLabel &&
    prevProps.subPriceLabel === nextProps.subPriceLabel &&
    metaRowsEqual(prevProps.metaRows, nextProps.metaRows) &&
    arraysEqualByStringValue(prevProps.imageUrls, nextProps.imageUrls) &&
    arraysEqualByStringValue(prevProps.chips, nextProps.chips)
  );
});
