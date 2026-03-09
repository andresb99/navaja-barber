import type { Metadata } from 'next';
import { PRIVATE_SECTION_METADATA } from '@/lib/site-metadata';

export const metadata: Metadata = PRIVATE_SECTION_METADATA;

export default function CuentaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
