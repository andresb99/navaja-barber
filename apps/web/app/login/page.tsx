import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/public/login-form';
import { resolveSafeNextPath } from '@/lib/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface LoginPageProps {
  searchParams: Promise<{
    next?: string;
    mode?: string;
    message?: string;
  }>;
}

function resolveInitialMode(value: string | undefined): 'login' | 'register' | 'recover' | 'reset' {
  if (value === 'register' || value === 'recover' || value === 'reset') {
    return value;
  }
  return 'login';
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = resolveSafeNextPath(params.next, '/cuenta');
  const initialMode = resolveInitialMode(params.mode);

  if (initialMode !== 'reset') {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect(nextPath);
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl">
      <LoginForm initialMode={initialMode} nextPath={nextPath} initialMessage={params.message || null} />
    </section>
  );
}

