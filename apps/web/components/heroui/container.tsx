import type { ComponentPropsWithoutRef, ElementType } from 'react';
import { cn } from '@/lib/cn';

const containerVariantClassName = {
  hero: 'section-hero',
  normal: 'surface-card',
  premium: 'admin-premium-hero rounded-[2rem]',
  pageHeader: 'admin-premium-hero rounded-[2rem]',
  section: 'surface-card',
} as const;

type ContainerVariant = keyof typeof containerVariantClassName;

type ContainerProps<T extends ElementType = 'div'> = {
  as?: T;
  variant?: ContainerVariant;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;

export function Container<T extends ElementType = 'div'>({
  as,
  variant = 'hero',
  className,
  ...props
}: ContainerProps<T>) {
  const Component = as || 'div';

  return <Component className={cn(containerVariantClassName[variant], className)} {...props} />;
}
