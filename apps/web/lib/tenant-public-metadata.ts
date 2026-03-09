import type { Metadata } from 'next';
import {
  buildTenantCanonicalCourseHref,
  buildTenantCanonicalHref,
  buildTenantCanonicalModelRegistrationHref,
  type TenantPublicAddress,
} from '@/lib/tenant-public-urls';
import { buildBasePageMetadata } from '@/lib/site-metadata';

interface TenantPageMetadataOptions {
  shop: TenantPublicAddress;
  title: string;
  description: string;
  section: 'profile' | 'book' | 'jobs' | 'courses' | 'modelos' | 'modelos_registro';
  courseId?: string | null;
  sessionId?: string | null;
  noIndex?: boolean;
}

function getCanonicalUrl(options: TenantPageMetadataOptions) {
  if (options.section === 'courses' && options.courseId) {
    return buildTenantCanonicalCourseHref(options.shop, options.courseId);
  }

  if (options.section === 'modelos_registro') {
    return buildTenantCanonicalModelRegistrationHref(options.shop, {
      sessionId: options.sessionId ?? null,
    });
  }

  return buildTenantCanonicalHref(options.shop, options.section);
}

export function buildTenantPageMetadata(options: TenantPageMetadataOptions): Metadata {
  return buildBasePageMetadata({
    title: options.title,
    description: options.description,
    canonical: getCanonicalUrl(options),
    ...(typeof options.noIndex === 'boolean' ? { noIndex: options.noIndex } : {}),
  });
}
