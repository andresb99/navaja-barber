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
import {
  DEFAULT_SITE_HEADER_STATE,
  type AccessibleWorkspaceMeta,
  type HeaderRole,
  type SiteHeaderInitialState,
} from '@/lib/site-header-state';
import { buildAdminHref, buildStaffHref } from '@/lib/workspace-routes';

type NavRole = HeaderRole;
type ThemeMode = 'light' | 'dark';
type NavigationContext = 'public' | 'staff' | 'admin';
type HeaderLink = {
  href: string;
  label: string;
  key: string;
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

function buildPublicHeaderHref(
  segment: string,
  shopSlug: string | null,
  mode: 'path' | 'custom_domain' | 'platform_subdomain',
) {
  if (!shopSlug) {
    if (!segment) {
      return '/shops';
    }

    return `/${segment}`;
  }

  if (mode === 'custom_domain' || mode === 'platform_subdomain') {
    return segment ? `/${segment}` : '/';
  }

  const basePath = `/shops/${shopSlug}`;
  if (!segment) {
    return basePath;
  }

  return `${basePath}/${segment}`;
}

function getHomeHref(
  role: NavRole,
  shopSlug: string | null,
  mode: 'path' | 'custom_domain' | 'platform_subdomain',
) {
  if (role === 'admin') {
    return '/admin';
  }

  if (role === 'staff') {
    return '/staff';
  }

  return buildPublicHeaderHref('', shopSlug, mode);
}

function areWorkspaceDirectoriesEqual(
  left: AccessibleWorkspaceMeta[],
  right: AccessibleWorkspaceMeta[],
) {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    const leftItem = left[index];
    const rightItem = right[index];
    if (!leftItem || !rightItem) {
      return false;
    }

    if (
      leftItem.id !== rightItem.id ||
      leftItem.slug !== rightItem.slug ||
      leftItem.name !== rightItem.name
    ) {
      return false;
    }
  }

  return true;
}

interface SiteHeaderProps {
  initialState?: SiteHeaderInitialState;
}

export function SiteHeader({ initialState = DEFAULT_SITE_HEADER_STATE }: SiteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentShopSlug = useMemo(
    () => getCurrentShopSlug(pathname) || initialState.publicTenantSlug,
    [initialState.publicTenantSlug, pathname],
  );
  const publicTenantMode = initialState.publicTenantMode;
  const activeWorkspaceSlug = useMemo(
    () => searchParams.get('shop')?.trim() || null,
    [searchParams],
  );
  const [role, setRole] = useState<NavRole>(initialState.role);
  const [profileName, setProfileName] = useState<string | null>(initialState.profileName);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(
    initialState.profileAvatarUrl,
  );
  const [userEmail, setUserEmail] = useState<string | null>(initialState.userEmail);
  const [pendingNotificationCount, setPendingNotificationCount] = useState(
    initialState.pendingNotificationCount,
  );
  const [hasWorkspaceAccess, setHasWorkspaceAccess] = useState(
    initialState.hasWorkspaceAccess,
  );
  const [workspaceDirectory, setWorkspaceDirectory] = useState<AccessibleWorkspaceMeta[]>(
    initialState.workspaceDirectory,
  );
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(initialState.isPlatformAdmin);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRole((current) => (current === initialState.role ? current : initialState.role));
    setProfileName((current) =>
      current === initialState.profileName ? current : initialState.profileName,
    );
    setProfileAvatarUrl((current) =>
      current === initialState.profileAvatarUrl ? current : initialState.profileAvatarUrl,
    );
    setUserEmail((current) =>
      current === initialState.userEmail ? current : initialState.userEmail,
    );
    setPendingNotificationCount((current) =>
      current === initialState.pendingNotificationCount
        ? current
        : initialState.pendingNotificationCount,
    );
    setHasWorkspaceAccess((current) =>
      current === initialState.hasWorkspaceAccess
        ? current
        : initialState.hasWorkspaceAccess,
    );
    setWorkspaceDirectory((current) =>
      areWorkspaceDirectoriesEqual(current, initialState.workspaceDirectory)
        ? current
        : initialState.workspaceDirectory,
    );
    setIsPlatformAdmin((current) =>
      current === initialState.isPlatformAdmin ? current : initialState.isPlatformAdmin,
    );
    setLoading(false);
  }, [initialState]);
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
      href: buildPublicHeaderHref(item.segment, currentShopSlug, publicTenantMode),
      label: item.label,
      key: `${item.segment || 'home'}:${item.label}`,
    }));
  }, [activeWorkspaceSlug, currentShopSlug, navigationContext, publicTenantMode]);
  const homeHref = useMemo(
    () =>
      getHomeHref(
        navigationContext === 'admin'
          ? 'admin'
          : navigationContext === 'staff'
            ? 'staff'
            : 'guest',
        currentShopSlug,
        publicTenantMode,
      ),
    [currentShopSlug, navigationContext, publicTenantMode],
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
  const hasMultipleWorkspaces = workspaceDirectory.length > 1;
  const workspaceHubHref = useMemo(() => {
    if (workspaceDirectory.length === 1) {
      const singleWorkspace = workspaceDirectory[0];
      if (singleWorkspace) {
        return `/mis-barberias/select?shop=${encodeURIComponent(singleWorkspace.id)}`;
      }
    }

    return '/mis-barberias';
  }, [workspaceDirectory]);
  const workspaceHubLabel = hasMultipleWorkspaces ? 'Mis barberias' : 'Mi barberia';
  const subscriptionHref = useMemo(() => {
    if (!activeWorkspaceSlug) {
      return '/suscripcion';
    }

    return `/suscripcion?shop=${encodeURIComponent(activeWorkspaceSlug)}`;
  }, [activeWorkspaceSlug]);

  const applyTheme = useCallback((nextTheme: ThemeMode) => {
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    try {
      localStorage.setItem('navaja-theme', nextTheme);
    } catch {
      // Ignore storage failures (private mode / blocked storage).
    }
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    const handleProfileUpdated = () => {
      router.refresh();
    };

    window.addEventListener('profile-updated', handleProfileUpdated);
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdated);
    };
  }, [router]);

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

  const handleSignOut = useCallback(() => {
    setIsMenuOpen(false);
    window.location.assign(`/auth/logout?next=${encodeURIComponent(homeHref)}`);
  }, [homeHref]);

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
        router.push(workspaceHubHref);
        return;
      }

      if (action === 'app-admin') {
        setIsMenuOpen(false);
        router.push('/app-admin/subscriptions');
        return;
      }

      if (action === 'subscription') {
        setIsMenuOpen(false);
        router.push(subscriptionHref);
        return;
      }

      if (action === 'create-shop') {
        setIsMenuOpen(false);
        router.push('/onboarding/barbershop');
        return;
      }

      if (action === 'theme-toggle') {
        applyTheme(theme === 'dark' ? 'light' : 'dark');
        return;
      }

      if (action === 'logout') {
        void handleSignOut();
      }
    },
    [
      activeWorkspaceSlug,
      applyTheme,
      handleSignOut,
      role,
      router,
      subscriptionHref,
      theme,
      workspaceHubHref,
    ],
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
              href={workspaceHubHref}
              variant="ghost"
              size="sm"
              className={actionButtonClassName}
            >
              <Store className="h-4 w-4" />
              <span>{workspaceHubLabel}</span>
            </Button>
          </NavbarItem>
        ) : null}

        {!loading && role !== 'guest' && navigationContext === 'public' ? (
          <NavbarItem className="hidden md:flex">
            <Button
              as={NextLink}
              href={subscriptionHref}
              variant="ghost"
              size="sm"
              className={actionButtonClassName}
            >
              Suscripcion
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

        {activeWorkspaceLabel && hasMultipleWorkspaces && navigationContext !== 'public' ? (
          <NavbarItem className="hidden lg:flex">
            <NextLink href={workspaceHubHref} className={workspaceSwitcherClassName}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/65 bg-white/60 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100">
                <Store className="h-4 w-4" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/60 dark:text-white/85">
                  {navigationContext === 'admin' ? 'Admin activo' : 'Staff activo'}
                </span>
                <span className="max-w-[9rem] truncate text-sm font-semibold leading-tight text-ink dark:text-slate-100">
                  {activeWorkspaceLabel}
                </span>
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-ink/65 transition-colors group-hover:text-ink dark:text-white/85 dark:group-hover:text-white">
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
                <DropdownItem key="subscription">Suscripcion</DropdownItem>
                {isPlatformAdmin ? (
                  <DropdownItem key="app-admin">Switch de suscripciones</DropdownItem>
                ) : null}
                <DropdownItem
                  key="theme-toggle"
                  startContent={theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                >
                  {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                </DropdownItem>
                <DropdownItem key="create-shop">Crear barberia</DropdownItem>
                {hasWorkspaceAccess ? (
                  <DropdownItem key="workspaces">{workspaceHubLabel}</DropdownItem>
                ) : null}
                <DropdownItem key="logout" className="text-danger" color="danger">
                  Salir
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </NavbarItem>
        ) : null}

        {!loading && role === 'guest' ? (
          <NavbarItem>
            <Button
              type="button"
              isIconOnly
              variant="light"
              radius="full"
              onPress={handleThemeToggle}
              aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              className="h-10 w-10 min-w-10 rounded-2xl border border-white/75 bg-white/58 p-0 text-ink shadow-[0_16px_24px_-20px_rgba(15,23,42,0.24)] transition data-[hover=true]:border-white/90 data-[hover=true]:bg-white/84 data-[hover=true]:text-sky-700 data-[pressed=true]:scale-100 data-[pressed=true]:bg-white/88 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:data-[hover=true]:bg-white/[0.08] dark:data-[hover=true]:text-sky-200"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </NavbarItem>
        ) : null}

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
              href={workspaceHubHref}
              onClick={() => setIsMenuOpen(false)}
              className="nav-link-pill flex w-full items-center justify-start gap-2 no-underline"
            >
              <Store className="h-4 w-4" />
              {workspaceHubLabel}
            </NextLink>
          </NavbarMenuItem>
        ) : null}

        {navigationContext !== 'public' && hasMultipleWorkspaces ? (
          <NavbarMenuItem>
            <NextLink
              href={workspaceHubHref}
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
              href={subscriptionHref}
              onClick={() => setIsMenuOpen(false)}
              className="nav-link-pill flex w-full justify-start no-underline"
            >
              Suscripcion
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
