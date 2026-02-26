'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { HeaderBrand } from '@/components/public/header-brand';
import FadeContent from '@/components/FadeContent';
import GlassSurface from '@/components/GlassSurface';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { SHOP_ID } from '@/lib/constants';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

type NavRole = 'guest' | 'user' | 'staff' | 'admin';
type ThemeMode = 'light' | 'dark';

const baseLinks = [
  {
    href: '/book',
    label: 'Agendar',
    description: 'Agenda servicios y horarios con disponibilidad real.',
  },
  {
    href: '/courses',
    label: 'Cursos',
    description: 'Inscripciones y sesiones para formacion profesional.',
  },
  {
    href: '/modelos',
    label: 'Modelos',
    description: 'Convocatoria para practicas y registro de perfiles.',
  },
  {
    href: '/jobs',
    label: 'Empleo',
    description: 'Postulaciones y seguimiento interno de candidatos.',
  },
] as const;

const exploreLinks = [
  {
    href: '/',
    label: 'Inicio',
    description: 'Vista general de operaciones y acceso rapido.',
  },
  ...baseLinks,
] as const;

const roleLabel: Record<Exclude<NavRole, 'guest'>, string> = {
  user: 'Usuario',
  staff: 'Staff',
  admin: 'Admin',
};

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [loading, setLoading] = useState(true);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

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
      'rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.11em] no-underline transition-[color,background-color,opacity,transform] duration-200',
      isActivePath(pathname, href)
        ? 'bg-white/20 text-slate-900 shadow-[0_10px_18px_-14px_rgba(15,23,42,0.55)] dark:bg-white/14 dark:text-white'
        : 'text-slate-800/82 hover:bg-white/14 hover:text-slate-900 hover:opacity-100 dark:text-white/82 dark:hover:bg-white/9 dark:hover:text-white',
    );

  return (
    <header className="sticky top-0 z-50">
      <FadeContent blur duration={720} ease="power2.out" initialOpacity={0} className="mx-auto max-w-6xl px-4 pt-4">
        <GlassSurface
          width="100%"
          height={58}
          className="w-full rounded-full"
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
          backgroundOpacity={0.1}
          saturation={1}
          mixBlendMode="screen"
        >
          <div className="flex h-full items-center justify-between gap-3 px-3">
            <Link href="/" className="no-underline">
              <HeaderBrand />
            </Link>

            <nav className="hidden items-center gap-1.5 md:flex">
              {exploreLinks.map((item) => (
                <Link key={item.href} href={item.href} className={desktopLinkClassName(item.href)}>
                  {item.label}
                </Link>
              ))}

              {rolePanelTarget ? (
                <Button asChild size="sm" variant="secondary">
                  <Link href={rolePanelTarget.href} className="no-underline">
                    {rolePanelTarget.label}
                  </Link>
                </Button>
              ) : null}

              {role === 'guest' ? (
                <Button asChild size="sm" variant="primary">
                  <Link href="/login" className="no-underline">
                    Ingresar
                  </Link>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  glass
                  className="h-9 px-3.5 !text-slate-900 dark:!text-white"
                  glassProps={{ borderRadius: 999 }}
                  onClick={handleSignOut}
                >
                  Salir
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                glass
                className="h-9 w-9 px-0 !text-slate-900 dark:!text-white"
                glassProps={{ borderRadius: 999 }}
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
                title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              {!loading && role !== 'guest' ? <Badge className="ml-2">{roleLabel[role]}</Badge> : null}
            </nav>

            <div className="relative md:hidden" ref={mobileMenuRef}>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  glass
                  className="h-9 w-9 px-0 !text-slate-900 dark:!text-white"
                  glassProps={{ borderRadius: 999 }}
                  onClick={toggleTheme}
                  aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
                  title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  glass
                  className="h-9 w-9 px-0 !text-slate-900 dark:!text-white"
                  glassProps={{ borderRadius: 999 }}
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  aria-expanded={mobileMenuOpen}
                  aria-controls="mobile-nav-panel"
                  aria-label={mobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
                  title={mobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
                >
                  {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
              </div>

              {mobileMenuOpen ? (
                <FadeContent
                  blur
                  duration={260}
                  ease="power2.out"
                  initialOpacity={0}
                  id="mobile-nav-panel"
                  className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(92vw,22rem)]"
                >
                  <GlassSurface
                    width="100%"
                    height="auto"
                    className="w-full rounded-2xl"
                    borderRadius={18}
                    borderWidth={0.07}
                    blur={11}
                    displace={0.5}
                    distortionScale={-180}
                    redOffset={0}
                    greenOffset={10}
                    blueOffset={20}
                    brightness={50}
                    opacity={0.93}
                    backgroundOpacity={0.1}
                    saturation={1}
                    mixBlendMode="screen"
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink dark:text-slate-100">
                          Menu Navaja
                        </p>
                        {!loading && role !== 'guest' ? <Badge>{roleLabel[role]}</Badge> : null}
                      </div>

                      <div className="mt-3 space-y-2">
                        {exploreLinks.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              'block rounded-xl border px-3 py-2.5 no-underline transition-[opacity,background-color] duration-200',
                              isActivePath(pathname, item.href)
                                ? 'border-brass/55 bg-brass/15 dark:bg-brass/20'
                                : 'border-slate/20 bg-white/70 dark:border-slate-700 dark:bg-slate-900/70',
                            )}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <p className="text-sm font-semibold text-ink dark:text-slate-100">{item.label}</p>
                            <p className="mt-1 text-xs text-slate/75 dark:text-slate-300">{item.description}</p>
                          </Link>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        {rolePanelTarget ? (
                          <Button asChild size="sm" variant="secondary">
                            <Link href={rolePanelTarget.href} className="no-underline" onClick={() => setMobileMenuOpen(false)}>
                              {rolePanelTarget.label}
                            </Link>
                          </Button>
                        ) : null}

                        {role === 'guest' ? (
                          <Button asChild size="sm" variant="primary" className="flex-1">
                            <Link href="/login" className="no-underline" onClick={() => setMobileMenuOpen(false)}>
                              Ingresar
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            glass
                            className="flex-1 !text-slate-900 dark:!text-white"
                            glassProps={{ borderRadius: 10 }}
                            onClick={() => {
                              void handleSignOut();
                            }}
                          >
                            Salir
                          </Button>
                        )}
                      </div>
                    </div>
                  </GlassSurface>
                </FadeContent>
              ) : null}
            </div>
          </div>
        </GlassSurface>
      </FadeContent>
    </header>
  );
}
