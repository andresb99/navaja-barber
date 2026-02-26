import { env } from './env';

export const APP_NAME = 'Navaja Barber';
export const SHOP_ID = env.NEXT_PUBLIC_SHOP_ID;

export const METRIC_RANGES = {
  today: 'today',
  last7: 'last7',
  month: 'month',
} as const;

export type MetricRangeKey = (typeof METRIC_RANGES)[keyof typeof METRIC_RANGES];

