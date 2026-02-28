'use client';

import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type Key } from 'react';
import { Moon, Sun } from 'lucide-react';
import {
  Avatar,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Link,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
} from '@heroui/react';
import { HeaderBrand } from '@/components/public/header-brand';
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

const adminHeaderLinks = [
  { href: '/admin', label: 'Resumen' },
  { href: '/admin/appointments', label: 'Citas' },
  { href: '/admin/staff', label: 'Equipo' },
  { href: '/admin/services', label: 'Servicios' },
  { href: '/admin/courses', label: 'Cursos' },
  { href: '/admin/modelos', label: 'Modelos' },
  { href: '/admin/applicants', label: 'Postulantes' },
  { href: '/admin/metrics', label: 'Metricas' },
] as const;

const staffHeaderLinks = [
  { href: '/staff', label: 'Agenda' },
  { href: '/book', label: 'Agendar' },
  { href: '/cuenta', label: 'Cuenta' },
] as const;

const actionButtonClassName =
  'h-10 rounded-2xl border border-white/75 bg-white/58 px-4 text-xs font-semibold text-ink no-underline shadow-[0_16px_24px_-20px_rgba(15,23,42,0.24)] transition-[background-color,transform,box-shadow,color,border-color] duration-150 data-[hover=true]:-translate-y-px data-[hover=true]:border-white/90 data-[hover=true]:bg-white/84 data-[pressed=true]:scale-[0.98] data-[pressed=true]:bg-white/92 data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-sky-400/55 data-[focus-visible=true]:ring-offset-1 data-[focus-visible=true]:ring-offset-transparent dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:data-[hover=true]:bg-white/[0.08] dark:data-[pressed=true]:bg-white/[0.09]';

function getAvatarInitials(name: string | null, email: string | null) {
  const source = (name || email || '').trim();
  if (!source) {
    return 'U';
  }

  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    const first = parts[0] || '';
    return first.slice(0, 2).toUpperCase();
  }

  const first = parts[0] || '';
  const second = parts[1] || '';
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<NavRole>('guest');
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const avatarInitials = useMemo(
    () => getAvatarInitials(profileName, userEmail),
    [profileName, userEmail],
  );
  const avatarProps = useMemo(
    () => (profileAvatarUrl ? { src: profileAvatarUrl } : {}),
    [profileAvatarUrl],
  );
  const activeHeaderLinks = useMemo(() => {
    if (role === 'admin') {
      return adminHeaderLinks;
    }

    if (role === 'staff') {
      return staffHeaderLinks;
    }

    return headerLinks;
  }, [role]);
  const activeHeaderHref = useMemo(() => {
    let bestMatch: string | null = null;

    for (const item of activeHeaderLinks) {
      if (!isActivePath(pathname, item.href)) {
        continue;
      }

      if (!bestMatch || item.href.length > bestMatch.length) {
        bestMatch = item.href;
      }
    }

    return bestMatch;
  }, [activeHeaderLinks, pathname]);

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
      setProfileName(null);
      setProfileAvatarUrl(null);
      setUserEmail(null);
      setLoading(false);
      return;
    }

    setUserEmail(user.email ?? null);

    const [{ data: staffRow }, { data: profileRow }] = await Promise.all([
      supabase
        .from('staff')
        .select('role')
        .eq('shop_id', SHOP_ID)
        .eq('auth_user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(),
      supabase
        .from('user_profiles')
        .select('full_name, avatar_url')
        .eq('auth_user_id', user.id)
        .maybeSingle(),
    ]);

    if (staffRow?.role === 'admin') {
      setRole('admin');
    } else if (staffRow?.role === 'staff') {
      setRole('staff');
    } else {
      setRole('user');
    }

    const metadataName =
      typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null;
    setProfileName((profileRow?.full_name as string | null) || metadataName || null);
    setProfileAvatarUrl((profileRow?.avatar_url as string | null) || null);
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
    const handleProfileUpdated = () => {
      void loadAuthState();
    };

    window.addEventListener('profile-updated', handleProfileUpdated);
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdated);
    };
  }, [loadAuthState]);

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

    const fallbackTheme: ThemeMode = document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light';
    setTheme(fallbackTheme);
    document.documentElement.classList.toggle('dark', fallbackTheme === 'dark');
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const handleThemeToggle = useCallback(() => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  }, [applyTheme, theme]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    setRole('guest');
    setProfileName(null);
    setProfileAvatarUrl(null);
    setUserEmail(null);
    setIsMenuOpen(false);
    router.replace('/');
    router.refresh();
  }, [router, supabase]);

  const handleAvatarAction = useCallback(
    (key: Key) => {
      const action = String(key);

      if (action === 'account') {
        setIsMenuOpen(false);
        router.push('/cuenta');
        return;
      }

      if (action === 'logout') {
        void handleSignOut();
      }
    },
    [handleSignOut, router],
  );

  return (
    <Navbar
      isBlurred={false}
      maxWidth="full"
      height="88px"
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      className="bg-transparent px-0 pt-3"
      classNames={{
        wrapper: 'glass-nav mx-auto w-[calc(100%-1rem)] max-w-[84rem] px-3 sm:px-4',
        menu: 'mx-4 mt-3 rounded-[1.6rem] border border-white/80 bg-white/90 p-4 shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#091120]/88',
      }}
    >
      <NavbarContent justify="start">
        <NavbarBrand className="h-full items-center py-0">
          <NextLink href="/" className="flex h-full items-center no-underline">
            <HeaderBrand />
          </NextLink>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden md:flex" justify="center">
        {activeHeaderLinks.map((item) => {
          const isActive = item.href === activeHeaderHref;
          return (
            <NavbarItem key={item.href} isActive={isActive}>
              <Link
                as={NextLink}
                href={item.href}
                color="foreground"
                aria-current={isActive ? 'page' : undefined}
                className="nav-link-pill no-underline"
                data-active={String(isActive)}
              >
                {item.label}
              </Link>
            </NavbarItem>
          );
        })}
      </NavbarContent>

      <NavbarContent justify="end">
        {role === 'guest' ? (
          <NavbarItem className="hidden md:flex">
            <Button
              as={NextLink}
              href="/login"
              variant="ghost"
              size="sm"
              className={actionButtonClassName}
            >
              Ingresar
            </Button>
          </NavbarItem>
        ) : null}

        {!loading && role !== 'guest' ? (
          <NavbarItem>
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <button
                  type="button"
                  className="flex items-center rounded-full outline-none ring-offset-0 transition data-[hover=true]:opacity-90"
                  aria-label="Abrir menu de perfil"
                >
                  <Avatar
                    {...avatarProps}
                    name={profileName || userEmail || roleLabel[role]}
                    fallback={avatarInitials}
                    size="sm"
                    className="h-10 w-10 border border-white/75 bg-white/68 text-ink shadow-[0_16px_24px_-20px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                  />
                </button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Menu de perfil" onAction={handleAvatarAction}>
                <DropdownItem
                  key="profile-summary"
                  isReadOnly
                  textValue="Perfil"
                  className="cursor-default opacity-100"
                  description={userEmail || roleLabel[role]}
                >
                  {profileName || 'Mi perfil'}
                </DropdownItem>
                <DropdownItem key="account">Mi cuenta</DropdownItem>
                <DropdownItem key="logout" className="text-danger" color="danger">
                  Salir
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </NavbarItem>
        ) : null}

        <NavbarItem>
          <Button
            type="button"
            isIconOnly
            variant="light"
            radius="full"
            onPress={handleThemeToggle}
            aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            className="h-10 w-10 min-w-0 rounded-2xl border border-white/75 bg-white/58 p-0 text-ink shadow-[0_16px_24px_-20px_rgba(15,23,42,0.24)] transition data-[hover=true]:-translate-y-px data-[hover=true]:border-white/90 data-[hover=true]:bg-white/84 data-[hover=true]:text-sky-700 data-[pressed=true]:scale-100 data-[pressed=true]:bg-white/88 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:data-[hover=true]:bg-white/[0.08] dark:data-[hover=true]:text-sky-200"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </NavbarItem>

        <NavbarItem className="md:hidden">
          <NavbarMenuToggle
            aria-label={isMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
            className="text-ink data-[hover=true]:bg-white/65 dark:text-white dark:data-[hover=true]:bg-white/[0.06]"
          />
        </NavbarItem>
      </NavbarContent>

      <NavbarMenu>
        {activeHeaderLinks.map((item) => {
          const isActive = item.href === activeHeaderHref;
          return (
            <NavbarMenuItem key={item.href} isActive={isActive}>
              <Link
                as={NextLink}
                href={item.href}
                color="foreground"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setIsMenuOpen(false)}
                className="nav-link-pill flex w-full justify-start no-underline"
                data-active={String(isActive)}
              >
                {item.label}
              </Link>
            </NavbarMenuItem>
          );
        })}

        {role === 'guest' ? (
          <NavbarMenuItem>
            <Button
              as={NextLink}
              href="/login"
              variant="ghost"
              size="sm"
              className={cn(actionButtonClassName, 'w-full justify-center text-center')}
              onClick={() => setIsMenuOpen(false)}
            >
              Ingresar
            </Button>
          </NavbarMenuItem>
        ) : null}
      </NavbarMenu>
    </Navbar>
  );
}
