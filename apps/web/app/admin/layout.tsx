import type { Metadata } from 'next';
import { PRIVATE_SECTION_METADATA } from '@/lib/site-metadata';

export const metadata: Metadata = PRIVATE_SECTION_METADATA;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return <section className="admin-stage">{children}</section>;
}
