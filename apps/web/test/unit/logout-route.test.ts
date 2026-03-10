import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerClientMock, signOutMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: createServerClientMock,
}));

import { GET } from '@/app/auth/logout/route';

describe('auth logout route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-1234567890';
  });

  it('clears auth cookies on the redirect response', async () => {
    signOutMock.mockImplementation(async () => {
      const options = createServerClientMock.mock.calls[0]?.[2];
      options?.cookies?.setAll?.([
        {
          name: 'sb-test-auth-token',
          value: '',
          options: {
            path: '/',
            maxAge: 0,
          },
        },
      ]);
    });

    createServerClientMock.mockReturnValue({
      auth: {
        signOut: signOutMock,
      },
    });

    const request = {
      url: 'https://beardly.vercel.app/auth/logout?next=/admin',
      headers: new Headers({
        host: 'beardly.vercel.app',
      }),
      nextUrl: new URL('https://beardly.vercel.app/auth/logout?next=/admin'),
      cookies: {
        getAll: () => [{ name: 'sb-test-auth-token', value: 'cookie-value' }],
      },
    };

    const response = await GET(request as never);

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(response.headers.get('location')).toBe('https://beardly.vercel.app/admin');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.cookies.get('sb-test-auth-token')?.value).toBe('');
  });
});
