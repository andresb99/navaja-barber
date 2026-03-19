import type { Metadata } from 'next';
import { SoftwareParaBarberiasPage } from '@/components/public/software-para-barberias-page';
import { buildSitePageMetadata } from '@/lib/site-metadata';

export const metadata: Metadata = buildSitePageMetadata({
  title: 'Software para barberias',
  description:
    'Software para barberias con agenda online, pagos, staff, cursos, marketplace y metricas en una sola plataforma.',
  path: '/software-para-barberias',
});

export default function SoftwareParaBarberiasPageRoute() {
  return <SoftwareParaBarberiasPage />;
}
