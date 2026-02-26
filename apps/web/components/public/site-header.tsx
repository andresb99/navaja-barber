'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HeaderBrand } from '@/components/public/header-brand';
import GlassSurface from '@/components/GlassSurface';
import { cn } from '@/lib/cn';
import { SHOP_ID } from '@/lib/constants';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

type NavRole = 'guest' | 'user' | 'staff' | 'admin';
type ThemeMode = 'light' | 'dark';

const roleLabel: Record<Exclude<NavRole, 'guest'>, string> = {
  user: 'Usuario',
  staff: 'Staff',
  admin: 'Admin',
};

const headerLinks = [
  { href: '/', label: 'Inicio' },
  { href: '/book', label: 'Agendar' },
  { href: '/courses', label: 'Cursos' },
  { href: '/modelos', label: 'Modelos' },
  { href: '/jobs', label: 'Empleo' },
] as const;

function getRolePanelTarget(role: NavRole): { href: string; label: string } | null {
  if (role === 'user') {
    return { href: '/cuenta', label: 'Mi cuenta' };
  }
  if (role === 'staff') {
    return { href: '/staff', label: 'Panel staff' };
  }
  if (role === 'admin') {
    return { href: '/admin', label: 'Panel admin' };
  }
  return null;
}

function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<NavRole>('guest');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const rolePanelTarget = useMemo(() => getRolePanelTarget(role), [role]);

  const applyTheme = useCallback((nextTheme: ThemeMode) => {
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    try {
      localStorage.setItem('navaja-theme', nextTheme);
    } catch {
      // Ignore storage failures (private mode / blocked storage).
    }
    setTheme(nextTheme);
  }, []);

  const loadAuthState = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setRole('guest');
      setLoading(false);
      return;
    }

    const { data: staffRow } = await supabase
      .from('staff')
      .select('role')
      .eq('shop_id', SHOP_ID)
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (staffRow?.role === 'admin') {
      setRole('admin');
    } else if (staffRow?.role === 'staff') {
      setRole('staff');
    } else {
      setRole('user');
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (!active) {
        return;
      }
      await loadAuthState();
    })();

    const { data } = supabase.auth.onAuthStateChange(() => {
      void loadAuthState();
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [loadAuthState, supabase]);

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('navaja-theme');
      if (storedTheme === 'dark' || storedTheme === 'light') {
        setTheme(storedTheme);
        document.documentElement.classList.toggle('dark', storedTheme === 'dark');
        return;
      }
    } catch {
      // Ignore localStorage access issues and rely on current DOM class.
    }

    const fallbackTheme: ThemeMode = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setTheme(fallbackTheme);
    document.documentElement.classList.toggle('dark', fallbackTheme === 'dark');
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const toggleTheme = useCallback(() => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  }, [applyTheme, theme]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setRole('guest');
    setMobileMenuOpen(false);
    router.replace('/');
    router.refresh();
  }

  const desktopLinkClassName = (href: string) =>
    cn(
      'rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.11em] no-underline transition-colors duration-100',
      isActivePath(pathname, href)
        ? 'bg-white/16 text-white ring-1 ring-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.34)]'
        : 'text-white/82 hover:bg-white/10 hover:!text-white',
    );

  const mobileLinkClassName = (href: string) =>
    cn(
      'block rounded-xl px-3 py-2.5 text-sm font-semibold no-underline transition-colors duration-100',
      isActivePath(pathname, href)
        ? 'bg-white/14 text-white ring-1 ring-white/25'
        : 'text-white/85 hover:bg-white/10 hover:!text-white',
    );

  const actionButtonClassName =
    'h-9 rounded-lg px-3.5 text-sm font-semibold no-underline transition-colors duration-100';

  const themeButtonClassName =
    'h-9 w-9 px-0 !text-white/88 transition-colors duration-100 hover:!text-white hover:!bg-white/12';

  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <GlassSurface
          width="100%"
          height={58}
          className="w-full rounded-full ring-1 ring-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_18px_30px_-22px_rgba(0,0,0,0.85)]"
          borderRadius={999}
          borderWidth={0.07}
          blur={11}
          displace={0.5}
          distortionScale={-180}
          redOffset={0}
          greenOffset={10}
          blueOffset={20}
          brightness={50}
          opacity={0.93}
          backgroundOpacity={0.08}
          saturation={1}
          mixBlendMode="screen"
        >
          <div className="flex h-full items-center justify-between gap-3 px-3">
            <Link href="/" className="no-underline">
              <HeaderBrand />
            </Link>

            <nav className="hidden items-center gap-1.5 md:flex">
              {headerLinks.map((item) => {
                const isActive = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={desktopLinkClassName(item.href)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {rolePanelTarget ? (
                <Button
                  asChild
                  size="sm"
                  className={cn(actionButtonClassName, 'ml-1 !bg-white/10 !text-white hover:!bg-white/16')}
                >
                  <Link href={rolePanelTarget.href} className="no-underline">
                    {rolePanelTarget.label}
                  </Link>
                </Button>
              ) : null}

              {role === 'guest' ? (
                <Button
                  asChild
                  size="sm"
                  className={cn(actionButtonClassName, '!bg-white/10 !text-white hover:!bg-white/16')}
                >
                  <Link href="/login" className="no-underline">
                    Ingresar
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className={cn(actionButtonClassName, '!bg-white/10 !text-white hover:!bg-white/16')}
                  onClick={() => {
                    void handleSignOut();
                  }}
                >
                  Salir
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={themeButtonClassName}
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
                title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              {!loading && role !== 'guest' ? <Badge className="ml-1 !bg-white/14 !text-white !ring-white/30">{roleLabel[role]}</Badge> : null}
            </nav>

            <div className="flex items-center gap-2 md:hidden">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={themeButtonClassName}
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
                title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={themeButtonClassName}
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-nav-panel"
                aria-label={mobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
                title={mobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </GlassSurface>
      </div>

      {mobileMenuOpen ? (
        <>
          <button
            type="button"
            aria-label="Cerrar menu"
            className="fixed inset-0 z-40 bg-slate-950/30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            id="mobile-nav-panel"
            className="relative z-50 mt-3 border-y border-white/18 bg-[#060012]/86 backdrop-blur-xl md:hidden"
          >
            <div className="mx-auto max-w-6xl px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/75">Menu</p>
                {!loading && role !== 'guest' ? <Badge className="!bg-white/14 !text-white !ring-white/30">{roleLabel[role]}</Badge> : null}
              </div>

              <nav className="space-y-2">
                {headerLinks.map((item) => {
                  const isActive = isActivePath(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={mobileLinkClassName(item.href)}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-4 flex items-center gap-2">
                {rolePanelTarget ? (
                  <Button
                    asChild
                    size="sm"
                    className={cn(actionButtonClassName, 'flex-1 !bg-white/10 !text-white hover:!bg-white/16')}
                  >
                    <Link href={rolePanelTarget.href} className="no-underline" onClick={() => setMobileMenuOpen(false)}>
                      {rolePanelTarget.label}
                    </Link>
                  </Button>
                ) : null}

                {role === 'guest' ? (
                  <Button
                    asChild
                    size="sm"
                    className={cn(actionButtonClassName, 'flex-1 !bg-white/10 !text-white hover:!bg-white/16')}
                  >
                    <Link href="/login" className="no-underline" onClick={() => setMobileMenuOpen(false)}>
                      Ingresar
                    </Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className={cn(actionButtonClassName, 'flex-1 !bg-white/10 !text-white hover:!bg-white/16')}
                    onClick={() => {
                      void handleSignOut();
                    }}
                  >
                    Salir
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}
