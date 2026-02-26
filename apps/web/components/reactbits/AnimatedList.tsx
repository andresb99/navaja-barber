'use client';

import type React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';

interface AnimatedListProps<T> {
  items: readonly T[];
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  itemClassName?: string;
  staggerDelay?: number;
}

export default function AnimatedList<T>({
  items,
  getKey,
  renderItem,
  className,
  itemClassName,
  staggerDelay = 0.055,
}: AnimatedListProps<T>) {
  const reduceMotion = useReducedMotion();

  return (
    <ul className={cn('space-y-2', className)}>
      {items.map((item, index) => (
        <motion.li
          key={getKey(item, index)}
          className={itemClassName}
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 6, filter: 'blur(4px)' }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{
            duration: reduceMotion ? 0 : 0.28,
            delay: reduceMotion ? 0 : index * staggerDelay,
            ease: 'easeOut',
          }}
        >
          {renderItem(item, index)}
        </motion.li>
      ))}
    </ul>
  );
}
