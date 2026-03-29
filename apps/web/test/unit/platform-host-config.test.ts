import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPlatformHostConfig } from '@/lib/platform-host-config';

describe('getPlatformHostConfig', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN', 'www.beardly.com');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://www.beardly.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('strips www from NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN so tenant subdomains resolve', () => {
    expect(getPlatformHostConfig().rootDomain).toBe('beardly.com');
  });
});
