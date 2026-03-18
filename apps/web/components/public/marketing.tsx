'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button, Card, CardBody, Chip, Divider } from '@heroui/react';
import { Container } from '@/components/heroui/container';
import { cn } from '@/lib/cn';

export interface MarketingHeroAction {
  href: string;
  label: ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export interface MarketingStat {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
  valueClassName?: string;
  detailClassName?: string;
}

interface MarketingHeroProps {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  actions?: readonly MarketingHeroAction[];
  stats?: readonly MarketingStat[];
  aside?: ReactNode;
  className?: string;
  containerClassName?: string;
  layoutClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  statsClassName?: string;
}

interface MarketingPanelProps {
  eyebrow?: ReactNode;
  eyebrowClassName?: string;
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  children?: ReactNode;
}

interface MarketingSurfaceCardProps {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  href?: string;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  children?: ReactNode;
}

export const marketingPanelClassName = 'soft-panel rounded-[1.8rem] p-5';
export const marketingPanelComfortableClassName = 'soft-panel rounded-[1.8rem] p-6';
export const marketingSurfaceCardClassName = 'surface-card';
export const marketingHeadingClassName =
  'font-[family-name:var(--font-heading)] text-2xl font-semibold text-ink dark:text-slate-100';
export const marketingBodyClassName = 'mt-3 text-sm text-slate/80 dark:text-slate-300';
export const marketingStatLabelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.16em] text-slate/60 dark:text-slate-400';
export const marketingStatValueClassName =
  'mt-2 text-sm font-semibold text-ink dark:text-slate-100';
export const marketingCtaClassNames = {
  heroPrimary:
    'action-primary inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 py-3 text-center text-sm font-semibold sm:w-auto',
  heroSecondary:
    'action-secondary inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 py-3 text-center text-sm font-semibold sm:w-auto',
  panelPrimary:
    'action-primary inline-flex min-h-11 w-full items-center justify-center rounded-2xl px-4 py-2 text-center text-sm font-semibold sm:w-auto',
  panelSecondary:
    'action-secondary inline-flex min-h-11 w-full items-center justify-center rounded-2xl px-4 py-2 text-center text-sm font-semibold sm:w-auto',
} as const;

export function MarketingHero({
  eyebrow,
  title,
  description,
  actions,
  stats,
  aside,
  className,
  containerClassName = 'px-6 py-7 md:px-8 md:py-9',
  layoutClassName = 'relative z-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end',
  titleClassName = 'mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold text-ink md:text-[2.35rem] dark:text-slate-100',
  descriptionClassName = 'mt-3 max-w-2xl text-sm text-slate/80 dark:text-slate-300',
  statsClassName = 'grid gap-3 sm:grid-cols-3',
}: MarketingHeroProps) {
  const renderedAside =
    aside ||
    (stats?.length ? <MarketingStatGrid stats={stats} className={statsClassName} /> : null);

  return (
    <Container variant="hero" className={cn(containerClassName, className)}>
      <div className={layoutClassName}>
        <div>
          <Chip
            variant="bordered"
            size="sm"
            classNames={{
              base: 'border-white/60 bg-white/50 dark:border-white/10 dark:bg-white/5',
              content:
                'text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate/84 dark:text-slate-300',
            }}
          >
            {eyebrow}
          </Chip>
          <h1 className={titleClassName}>{title}</h1>
          <p className={descriptionClassName}>{description}</p>

          {actions?.length ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {actions.map((action, index) => (
                <Button
                  key={`${action.href}-${index}`}
                  as={Link}
                  href={action.href}
                  radius="full"
                  size="lg"
                  className={cn(
                    action.variant === 'secondary'
                      ? marketingCtaClassNames.heroSecondary
                      : marketingCtaClassNames.heroPrimary,
                    action.className,
                  )}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        {renderedAside}
      </div>
    </Container>
  );
}

export function MarketingStatGrid({
  stats,
  className,
}: {
  stats: readonly MarketingStat[];
  className?: string;
}) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-3', className)}>
      {stats.map((stat, index) => (
        <MarketingStatTile key={`${String(stat.label)}-${index}`} {...stat} />
      ))}
    </div>
  );
}

export function MarketingStatTile({
  label,
  value,
  detail,
  className,
  valueClassName,
  detailClassName,
}: MarketingStat) {
  return (
    <Card
      shadow="sm"
      classNames={{
        base: cn('stat-tile border-1', className),
        body: 'p-0',
      }}
    >
      <CardBody>
        <p className={marketingStatLabelClassName}>{label}</p>
        <p className={cn(marketingStatValueClassName, valueClassName)}>{value}</p>
        {detail ? (
          <p className={cn('mt-1 text-xs text-slate/70 dark:text-slate-300', detailClassName)}>
            {detail}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}

export function MarketingPanel({
  eyebrow,
  eyebrowClassName,
  title,
  description,
  className,
  contentClassName,
  titleClassName = marketingHeadingClassName,
  descriptionClassName = marketingBodyClassName,
  children,
}: MarketingPanelProps) {
  const hasHeader = Boolean(eyebrow || title || description);

  return (
    <Card
      shadow="none"
      classNames={{
        base: cn(marketingPanelClassName, className),
        body: 'p-0',
      }}
    >
      <CardBody>
        {eyebrow ? (
          <Chip
            variant="bordered"
            size="sm"
            className={eyebrowClassName}
            classNames={{
              base: 'border-white/60 bg-white/50 dark:border-white/10 dark:bg-white/5',
              content:
                'text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate/84 dark:text-slate-300',
            }}
          >
            {eyebrow}
          </Chip>
        ) : null}
        {title ? <h2 className={cn(eyebrow && 'mt-3', titleClassName)}>{title}</h2> : null}
        {description ? <p className={descriptionClassName}>{description}</p> : null}
        {hasHeader && children ? <Divider className="my-4 bg-white/20 dark:bg-white/5" /> : null}
        {children ? <div className={contentClassName}>{children}</div> : null}
      </CardBody>
    </Card>
  );
}

export function MarketingSurfaceCard({
  eyebrow,
  title,
  description,
  href,
  className,
  contentClassName,
  titleClassName = 'text-sm font-semibold text-ink dark:text-slate-100',
  descriptionClassName = 'text-sm text-slate/80 dark:text-slate-300',
  children,
}: MarketingSurfaceCardProps) {
  const content = (
    <>
      {eyebrow ? <p className={marketingStatLabelClassName}>{eyebrow}</p> : null}
      {title ? <p className={cn(eyebrow && 'mt-2', titleClassName)}>{title}</p> : null}
      {description ? (
        <p className={cn((eyebrow || title) && 'mt-2', descriptionClassName)}>{description}</p>
      ) : null}
      {children ? (
        <div className={cn((description || title) && 'mt-3', contentClassName)}>{children}</div>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Card
        as={Link}
        href={href}
        isPressable
        shadow="sm"
        classNames={{
          base: cn(marketingSurfaceCardClassName, 'no-underline', className),
          body: 'p-0',
        }}
      >
        <CardBody>{content}</CardBody>
      </Card>
    );
  }

  return (
    <Card
      shadow="sm"
      classNames={{
        base: cn(marketingSurfaceCardClassName, className),
        body: 'p-0',
      }}
    >
      <CardBody>{content}</CardBody>
    </Card>
  );
}
