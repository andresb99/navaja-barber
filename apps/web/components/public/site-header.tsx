'use client';

import NextLink from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type Key } from 'react';
import { ChevronRight, Moon, Store, Sun } from 'lucide-react';
import {
  Avatar,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
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
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { isPendingTimeOffReason } from '@/lib/time-off-requests';
import { buildAdminHref, buildStaffHref } from '@/lib/workspace-routes';

type NavRole = 'guest' | 'user' | 'staff' | 'admin';
type ThemeMode = 'light' | 'dark';
type NavigationContext = 'public' | 'staff' | 'admin';
type HeaderLink = {
  href: string;
  label: string;
  key: string;
};
type AccessibleWorkspaceMeta = {
  id: string;
  slug: string;
  name: string;
};

const roleLabel: Record<Exclude<NavRole, 'guest'>, string> = {
  user: 'Usuario',
  staff: 'Staff',
  admin: 'Admin',
};

const publicHeaderItems = [
  { segment: '', label: 'Inicio' },
  { segment: 'book', label: 'Agendar' },
  { segment: 'courses', label: 'Cursos' },
  { segment: 'modelos', label: 'Modelos' },
  { segment: 'jobs', label: 'Empleo' },
] as const;

const adminHeaderLinks = [
  { href: '/admin', label: 'Resumen' },
  { href: '/admin/appointments', label: 'Citas' },
  { href: '/admin/staff', label: 'Equipo' },
  { href: '/admin/services', label: 'Servicios' },
  { href: '/admin/barbershop', label: 'Barberia' },
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
  'h-10 rounded-2xl border border-white/75 bg-white/58 px-4 text-xs font-semibold text-ink no-underline shadow-[0_16px_24px_-20px_rgba(15,23,42,0.24)] transition-[background-color,transform,box-shadow,color,border-color] duration-150 data-[hover=true]:border-white/90 data-[hover=true]:bg-white/84 data-[pressed=true]:scale-[0.98] data-[pressed=true]:bg-white/92 data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-sky-400/55 data-[focus-visible=true]:ring-offset-1 data-[focus-visible=true]:ring-offset-transparent dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:data-[hover=true]:bg-white/[0.08] dark:data-[pressed=true]:bg-white/[0.09]';

const workspaceSwitcherClassName =
  'group hidden lg:flex items-center gap-3 rounded-2xl border border-white/70 bg-white/56 px-3 py-2 text-ink no-underline shadow-[0_16px_24px_-20px_rgba(15,23,42,0.24)] transition-[background-color,border-color,transform,box-shadow] duration-150 hover:border-white/90 hover:bg-white/82 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/55 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-white/[0.08]';

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
  const resolvedHref = new URL(href, 'http://localhost');
  const targetPathname = resolvedHref.pathname;

  if (targetPathname === '/') {
    return pathname === '/';
  }
  return pathname === targetPathname || pathname.startsWith(`${targetPathname}/`);
}

function getCurrentShopSlug(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);

  if (segments[0] !== 'shops' || !segments[1]) {
    return null;
  }

  return segments[1];
}

function buildPublicHeaderHref(segment: string, shopSlug: string | null) {
  if (!shopSlug) {
    if (!segment) {
      return '/shops';
    }

    return `/${segment}`;
  }

  const basePath = `/shops/${shopSlug}`;
  if (!segment) {
    return basePath;
  }

  return `${basePath}/${segment}`;
}

function getHomeHref(role: NavRole, shopSlug: string | null) {
  if (role === 'admin') {
    return '/admin';
  }

  if (role === 'staff') {
    return '/staff';
  }

  return buildPublicHeaderHref('', shopSlug);
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentShopSlug = useMemo(() => getCurrentShopSlug(pathname), [pathname]);
  const activeWorkspaceSlug = useMemo(
    () => searchParams.get('shop')?.trim() || null,
    [searchParams],
  );
  const [role, setRole] = useState<NavRole>('guest');
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [pendingNotificationCount, setPendingNotificationCount] = useState(0);
  const [hasWorkspaceAccess, setHasWorkspaceAccess] = useState(false);
  const [workspaceDirectory, setWorkspaceDirectory] = useState<AccessibleWorkspaceMeta[]>([]);
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
  const navigationContext = useMemo<NavigationContext>(() => {
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      return 'admin';
    }

    if (pathname === '/staff' || pathname.startsWith('/staff/')) {
      return 'staff';
    }

    return 'public';
  }, [pathname]);
  const activeHeaderLinks = useMemo<HeaderLink[]>(() => {
    if (navigationContext === 'admin') {
      return adminHeaderLinks.map((item) => ({
        href: buildAdminHref(item.href, activeWorkspaceSlug),
        label: item.label,
        key: `${item.href}:${item.label}`,
      }));
    }

    if (navigationContext === 'staff') {
      return staffHeaderLinks.map((item) => ({
        href: buildStaffHref(item.href, activeWorkspaceSlug),
        label: item.label,
        key: `${item.href}:${item.label}`,
      }));
    }

    return publicHeaderItems.map((item) => ({
      href: buildPublicHeaderHref(item.segment, currentShopSlug),
      label: item.label,
      key: `${item.segment || 'home'}:${item.label}`,
    }));
  }, [activeWorkspaceSlug, currentShopSlug, navigationContext]);
  const homeHref = useMemo(
    () =>
      getHomeHref(
        navigationContext === 'admin'
          ? 'admin'
          : navigationContext === 'staff'
            ? 'staff'
            : 'guest',
        currentShopSlug,
      ),
    [currentShopSlug, navigationContext],
  );
  const contextualHomeHref = useMemo(() => {
    if (navigationContext === 'admin') {
      return buildAdminHref('/admin', activeWorkspaceSlug);
    }

    if (navigationContext === 'staff') {
      return buildStaffHref('/staff', activeWorkspaceSlug);
    }

    return homeHref;
  }, [activeWorkspaceSlug, homeHref, navigationContext]);
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
  const activeWorkspaceName = useMemo(() => {
    const normalizedSlug = activeWorkspaceSlug?.trim().toLowerCase();

    if (!normalizedSlug) {
      return null;
    }

    return (
      workspaceDirectory.find((workspace) => workspace.slug.toLowerCase() === normalizedSlug)?.name || null
    );
  }, [activeWorkspaceSlug, workspaceDirectory]);
  const activeWorkspaceLabel = activeWorkspaceName || activeWorkspaceSlug;

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
      setPendingNotificationCount(0);
      setHasWorkspaceAccess(false);
      setWorkspaceDirectory([]);
      setLoading(false);
      return;
    }

    setUserEmail(user.email ?? null);

    const [{ data: membershipRows }, { data: pendingInviteRows }, { data: staffRows }, { data: profileRow }] =
      await Promise.all([
        supabase
          .from('shop_memberships')
          .select('role, shop_id')
          .eq('user_id', user.id)
          .eq('membership_status', 'active')
          .limit(5),
        supabase
          .from('shop_memberships')
          .select('id')
          .eq('user_id', user.id)
          .eq('membership_status', 'invited'),
        supabase
          .from('staff')
          .select('role, shop_id')
          .eq('auth_user_id', user.id)
          .eq('is_active', true)
          .limit(5),
        supabase
          .from('user_profiles')
          .select('full_name, avatar_url')
          .eq('auth_user_id', user.id)
          .maybeSingle(),
      ]);

    const membershipRoles = (membershipRows || []).map((item) => String(item.role));
    const staffRoles = (staffRows || []).map((item) => String(item.role));
    const accessibleShopIds = Array.from(
      new Set(
        [...(membershipRows || []), ...(staffRows || [])]
          .map((item) => (item?.shop_id ? String(item.shop_id) : ''))
          .filter(Boolean),
      ),
    );
    const { data: shopRows } = accessibleShopIds.length
      ? await supabase.from('shops').select('id, slug, name').in('id', accessibleShopIds)
      : { data: [] as { id: string; slug: string; name: string }[] };
    const hasAdminRole =
      membershipRoles.includes('owner') ||
      membershipRoles.includes('admin') ||
      staffRoles.includes('admin');
    const hasStaffRole = membershipRoles.includes('staff') || staffRoles.includes('staff');
    let nextPendingNotificationCount = (pendingInviteRows || []).length;

    if (hasAdminRole && accessibleShopIds.length > 0) {
      const { data: timeOffRows } = await supabase
        .from('time_off')
        .select('id, reason')
        .in('shop_id', accessibleShopIds)
        .order('created_at', { ascending: false })
        .limit(40);

      const pendingAbsenceApprovals = (timeOffRows || []).filter((item) =>
        isPendingTimeOffReason(item.reason as string | null),
      ).length;

      // The avatar badge only tracks actionable work:
      // user invitations that still need a decision, plus admin absence approvals.
      // Informational events remain visible in the notifications panel but no longer
      // keep the badge active after they are reviewed.
      nextPendingNotificationCount = (pendingInviteRows || []).length + pendingAbsenceApprovals;
    }

    setHasWorkspaceAccess(accessibleShopIds.length > 0);
    setPendingNotificationCount(nextPendingNotificationCount);
    setWorkspaceDirectory(
      (shopRows || []).map((row) => ({
        id: String(row.id),
        slug: String(row.slug),
        name: String(row.name),
      })),
    );

    if (hasAdminRole) {
      setRole('admin');
    } else if (hasStaffRole) {
      setRole('staff');
    } else {
      setRole('user');
    }

    const metadata = (user.user_metadata as Record<string, unknown> | undefined) ?? undefined;
    const metadataName =
      (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) ||
      (typeof metadata?.name === 'string' && metadata.name.trim()) ||
      null;
    const metadataAvatarUrl =
      (typeof metadata?.avatar_url === 'string' && metadata.avatar_url.trim()) ||
      (typeof metadata?.picture === 'string' && metadata.picture.trim()) ||
      null;

    setProfileName((profileRow?.full_name as string | null) || metadataName || null);
    setProfileAvatarUrl((profileRow?.avatar_url as string | null) || metadataAvatarUrl || null);
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
    setPendingNotificationCount(0);
    setHasWorkspaceAccess(false);
    setWorkspaceDirectory([]);
    setIsMenuOpen(false);
    router.replace('/shops');
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

      if (action === 'notifications') {
        setIsMenuOpen(false);
        router.push(
          role === 'admin'
            ? `${buildAdminHref('/admin', activeWorkspaceSlug)}#notificaciones`
            : '/cuenta#notificaciones',
        );
        return;
      }

      if (action === 'workspaces') {
        setIsMenuOpen(false);
        router.push('/mis-barberias');
        return;
      }

      if (action === 'create-shop') {
        setIsMenuOpen(false);
        router.push('/onboarding/barbershop');
        return;
      }

      if (action === 'logout') {
        void handleSignOut();
      }
    },
    [activeWorkspaceSlug, handleSignOut, role, router],
  );

  return (
    <Navbar
      isBlurred={false}
      maxWidth="full"
      height="76px"
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      className="bg-transparent px-0 pt-0"
      classNames={{
        wrapper: 'glass-nav mx-auto w-full max-w-none px-4 md:px-6 lg:px-8',
        menu: 'mobile-nav-menu',
      }}
    >
      <NavbarContent justify="start">
        <NavbarBrand className="h-full items-center py-0 md:w-[14rem]">
          <NextLink href={contextualHomeHref} className="flex h-full items-center no-underline md:w-full">
            <HeaderBrand />
          </NextLink>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden md:flex" justify="center">
        {activeHeaderLinks.map((item) => {
          const isActive = item.href === activeHeaderHref;
          return (
            <NavbarItem key={item.key} isActive={isActive}>
              <NextLink
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className="nav-link-pill no-underline"
                data-active={String(isActive)}
              >
                {item.label}
              </NextLink>
            </NavbarItem>
          );
        })}
      </NavbarContent>

      <NavbarContent justify="end">
        {!loading && role === 'guest' ? (
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

        {!loading && hasWorkspaceAccess && navigationContext === 'public' ? (
          <NavbarItem className="hidden md:flex">
            <Button
              as={NextLink}
              href="/mis-barberias"
              variant="ghost"
              size="sm"
              className={actionButtonClassName}
            >
              <Store className="h-4 w-4" />
              <span>Mis barberias</span>
            </Button>
          </NavbarItem>
        ) : null}

        {!loading && role !== 'guest' && navigationContext === 'public' ? (
          <NavbarItem className="hidden md:flex">
            <Button
              as={NextLink}
              href="/onboarding/barbershop"
              variant="ghost"
              size="sm"
              className={actionButtonClassName}
            >
              <Store className="h-4 w-4" />
              <span>Crear barberia</span>
            </Button>
          </NavbarItem>
        ) : null}

        {activeWorkspaceLabel && navigationContext !== 'public' ? (
          <NavbarItem className="hidden lg:flex">
            <NextLink href="/mis-barberias" className={workspaceSwitcherClassName}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/65 bg-white/60 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100">
                <Store className="h-4 w-4" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/60 dark:text-slate-300/70">
                  {navigationContext === 'admin' ? 'Admin activo' : 'Staff activo'}
                </span>
                <span className="max-w-[9rem] truncate text-sm font-semibold leading-tight">
                  {activeWorkspaceLabel}
                </span>
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-ink/65 transition-colors group-hover:text-ink dark:text-slate-300/70 dark:group-hover:text-slate-100">
                Cambiar
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </NextLink>
          </NavbarItem>
        ) : null}

        {!loading && role !== 'guest' ? (
          <NavbarItem>
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <button
                  type="button"
                  className="relative flex items-center rounded-full outline-none ring-offset-0 transition data-[hover=true]:opacity-90"
                  aria-label="Abrir menu de perfil"
                >
                  <Avatar
                    {...avatarProps}
                    name={profileName || userEmail || roleLabel[role]}
                    fallback={avatarInitials}
                    size="sm"
                    className="h-10 w-10 border border-white/75 bg-white/68 text-ink shadow-[0_16px_24px_-20px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                  />
                  {pendingNotificationCount > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black">
                      {pendingNotificationCount > 9 ? '9+' : pendingNotificationCount}
                    </span>
                  ) : null}
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
                <DropdownItem key="notifications">
                  Notificaciones
                  {pendingNotificationCount > 0 ? ` (${pendingNotificationCount})` : ''}
                </DropdownItem>
                <DropdownItem key="account">Mi cuenta</DropdownItem>
                <DropdownItem key="create-shop">Crear barberia</DropdownItem>
                {hasWorkspaceAccess ? <DropdownItem key="workspaces">Mis barberias</DropdownItem> : null}
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
            className="h-10 w-10 min-w-0 rounded-2xl border border-white/75 bg-white/58 p-0 text-ink shadow-[0_16px_24px_-20px_rgba(15,23,42,0.24)] transition data-[hover=true]:border-white/90 data-[hover=true]:bg-white/84 data-[hover=true]:text-sky-700 data-[pressed=true]:scale-100 data-[pressed=true]:bg-white/88 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:data-[hover=true]:bg-white/[0.08] dark:data-[hover=true]:text-sky-200"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </NavbarItem>

        <NavbarItem className="md:hidden">
          <NavbarMenuToggle
            aria-label={isMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
            className="h-10 w-10 min-w-10 rounded-2xl border border-white/75 bg-white/58 text-ink shadow-[0_16px_24px_-20px_rgba(15,23,42,0.24)] transition data-[hover=true]:border-white/90 data-[hover=true]:bg-white/84 data-[pressed=true]:scale-100 data-[pressed=true]:bg-white/88 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:data-[hover=true]:bg-white/[0.08]"
          />
        </NavbarItem>
      </NavbarContent>

      <NavbarMenu>
        {activeHeaderLinks.map((item) => {
          const isActive = item.href === activeHeaderHref;
          return (
            <NavbarMenuItem key={item.key} isActive={isActive}>
              <NextLink
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setIsMenuOpen(false)}
                className="nav-link-pill flex w-full justify-start no-underline"
                data-active={String(isActive)}
              >
                {item.label}
              </NextLink>
            </NavbarMenuItem>
          );
        })}

        {!loading && hasWorkspaceAccess && navigationContext === 'public' ? (
          <NavbarMenuItem>
            <NextLink
              href="/mis-barberias"
              onClick={() => setIsMenuOpen(false)}
              className="nav-link-pill flex w-full items-center justify-start gap-2 no-underline"
            >
              <Store className="h-4 w-4" />
              Mis barberias
            </NextLink>
          </NavbarMenuItem>
        ) : null}

        {navigationContext !== 'public' ? (
          <NavbarMenuItem>
            <NextLink
              href="/mis-barberias"
              onClick={() => setIsMenuOpen(false)}
              className="nav-link-pill flex w-full justify-start no-underline"
            >
              Cambiar barberia
            </NextLink>
          </NavbarMenuItem>
        ) : null}

        {!loading && role !== 'guest' ? (
          <NavbarMenuItem>
            <NextLink
              href="/onboarding/barbershop"
              onClick={() => setIsMenuOpen(false)}
              className="nav-link-pill flex w-full items-center justify-start gap-2 no-underline"
            >
              <Store className="h-4 w-4" />
              Crear barberia
            </NextLink>
          </NavbarMenuItem>
        ) : null}

        {!loading && role === 'guest' ? (
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
