import type { Metadata } from 'next';
import { PRIVATE_SECTION_METADATA } from '@/lib/site-metadata';

export const metadata: Metadata = PRIVATE_SECTION_METADATA;

export default function AppAdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
