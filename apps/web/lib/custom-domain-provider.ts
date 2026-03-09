import 'server-only';

import type { ShopDomainStatus } from '@/lib/custom-domains';

export interface CustomDomainProviderInput {
  shopId: string;
  shopSlug: string;
  domain: string;
}

export interface CustomDomainProviderResult {
  status: Exclude<ShopDomainStatus, 'active'>;
  message: string | null;
}

export interface CustomDomainProvider {
  prepare(input: CustomDomainProviderInput): Promise<CustomDomainProviderResult>;
  verify(input: CustomDomainProviderInput): Promise<CustomDomainProviderResult>;
  release(input: CustomDomainProviderInput): Promise<void>;
}

class ManualVercelCustomDomainProvider implements CustomDomainProvider {
  async prepare(): Promise<CustomDomainProviderResult> {
    return {
      status: 'pending',
      message: 'Agrega este dominio manualmente en Vercel y luego activalo desde el panel.',
    };
  }

  async verify(): Promise<CustomDomainProviderResult> {
    return {
      status: 'verified',
      message: 'Activacion manual confirmada. Puedes reemplazar este paso por verificacion automatica mas adelante.',
    };
  }

  async release() {}
}

export function getCustomDomainProvider(): CustomDomainProvider {
  return new ManualVercelCustomDomainProvider();
}
