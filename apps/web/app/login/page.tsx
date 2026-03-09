import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/public/login-form';
import { resolveSafeNextPath } from '@/lib/navigation';
import { buildSitePageMetadata } from '@/lib/site-metadata';
import { isMockRuntime } from '@/lib/test-runtime';

interface LoginPageProps {
  searchParams: Promise<{
    next?: string;
    mode?: string;
    message?: string;
  }>;
}

export const metadata: Metadata = buildSitePageMetadata({
  title: 'Acceso',
  description: 'Inicia sesion o crea tu cuenta para gestionar tu barberia o tus reservas.',
  path: '/login',
  noIndex: true,
  follow: false,
});

function resolveInitialMode(value: string | undefined): 'login' | 'register' | 'recover' | 'reset' {
  if (value === 'register' || value === 'recover' || value === 'reset') {
    return value;
  }
  return 'login';
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = resolveSafeNextPath(params.next, '/');
  const hasExplicitNext = typeof params.next === 'string' && params.next.trim().length > 0;
  const initialMode = resolveInitialMode(params.mode);

  if (initialMode !== 'reset' && !isMockRuntime()) {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      if (!hasExplicitNext) {
        redirect('/');
      }
      redirect(nextPath);
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl">
      <LoginForm initialMode={initialMode} nextPath={nextPath} initialMessage={params.message || null} />
    </section>
  );
}

