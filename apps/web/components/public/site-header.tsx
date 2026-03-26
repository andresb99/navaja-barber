'use client';

import NextLink from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type Key } from 'react';
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  ChevronRight,
  CreditCard,
  Moon,
  Store,
  Sun,
  Users,
} from 'lucide-react';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@heroui/react';
import { HeaderBrand } from '@/components/public/header-brand';
import { cn } from '@/lib/cn';
import {
  DEFAULT_SITE_HEADER_STATE,
  type AccessibleWorkspaceMeta,
  type HeaderRole,
  type SiteHeaderInitialState,
} from '@/lib/site-header-state';
import { STAFF_NAV_ITEMS } from '@/lib/staff-navigation';
import { buildPlatformUrl } from '@/lib/shop-links';
import { buildAdminHref, buildStaffHref } from '@/lib/workspace-routes';

type NavRole = HeaderRole;
type ThemeMode = 'light' | 'dark';
type NavigationContext = 'public' | 'staff' | 'admin';
type HeaderLink = {
  href: string;
  label: string;
  key: string;
};

type AdminNotificationPreviewItem = {
  id: string;
  kind: 'time_off' | 'membership' | 'payment';
  targetId: string;
  title: string;
  detail: string;
  createdAt: string | null;
  isNew: boolean;
};

const roleLabel: Record<Exclude<NavRole, 'guest'>, string> = {
  user: 'Usuario',
  staff: 'Staff',
  admin: 'Admin',
};

const publicHeaderItems = [
  { segment: '', label: 'Barberias' },
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

const actionButtonClassName =
  'h-10 rounded-2xl border border-white/75 bg-white/58 px-4 text-xs font-semibold text-ink no-underline shadow-[0_16px_24px_-20px_rgba(15,23,42,0.24)] transition-[background-color,transform,box-shadow,color,border-color] duration-150 data-[hover=true]:border-white/90 data-[hover=true]:bg-white/84 data-[pressed=true]:scale-[0.98] data-[pressed=true]:bg-white/92 data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-violet-400/55 data-[focus-visible=true]:ring-offset-1 data-[focus-visible=true]:ring-offset-transparent dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:data-[hover=true]:bg-white/[0.08] dark:data-[pressed=true]:bg-white/[0.09]';

const subscriptionButtonClassName =
  'h-10 rounded-2xl border border-violet-200/85 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(246,241,255,0.76))] px-4 text-xs font-semibold text-ink no-underline shadow-[0_18px_28px_-22px_rgba(139,92,246,0.22)] transition-[background-color,transform,box-shadow,color,border-color] duration-150 data-[hover=true]:border-violet-200 data-[hover=true]:bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(243,236,255,0.86))] data-[pressed=true]:scale-[0.98] data-[pressed=true]:bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,231,255,0.88))] data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-violet-400/55 data-[focus-visible=true]:ring-offset-1 data-[focus-visible=true]:ring-offset-transparent dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] dark:text-slate-100 dark:data-[hover=true]:bg-[linear-gradient(135deg,rgba(255,255,255,0.11),rgba(255,255,255,0.06))] dark:data-[pressed=true]:bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.07))]';

const workspaceSwitcherClassName =
  'group hidden lg:flex items-center gap-3 rounded-2xl border border-white/70 bg-white/56 px-3 py-2 text-ink no-underline shadow-[0_16px_24px_-20px_rgba(15,23,42,0.24)] transition-[background-color,border-color,transform,box-shadow] duration-150 hover:border-white/90 hover:bg-white/82 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/55 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-white/[0.08]';

const notificationTriggerClassName =
  'relative flex h-11 w-11 items-center justify-center rounded-[1.15rem] border border-white/75 bg-white/58 text-ink shadow-[0_16px_24px_-20px_rgba(15,23,42,0.24)] transition-[background-color,border-color,color,box-shadow] duration-150 hover:border-white/90 hover:bg-white/84 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.42)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.08]';

const notificationDropdownContentClassName =
  'admin-premium-card w-[min(92vw,24rem)] overflow-hidden rounded-[1.9rem] p-0';

const notificationPreviewLinkClassName =
  'admin-premium-subcard group flex items-start gap-3 rounded-[1.35rem] p-3 no-underline transition-[border-color,background-color,transform] duration-150 hover:-translate-y-[1px] hover:border-[hsl(var(--primary)/0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.26)] focus-visible:ring-offset-0 dark:hover:border-[hsl(var(--primary)/0.24)]';

function formatNotificationPreviewTime(value: string | null) {
  if (!value) {
    return 'Seguimiento operativo';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Seguimiento operativo';
  }

  return new Intl.DateTimeFormat('es-UY', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function NotificationPreviewIcon({ kind }: { kind: AdminNotificationPreviewItem['kind'] }) {
  const Icon = kind === 'time_off' ? CalendarClock : kind === 'membership' ? Users : CreditCard;

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] border border-white/75 bg-white/72 text-ink shadow-[0_16px_22px_-22px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

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
  _shopSlug: string | null,
  mode: 'path' | 'custom_domain' | 'platform_subdomain',
) {
  // Tenant domains: links are rooted at the tenant domain
  if (mode === 'custom_domain' || mode === 'platform_subdomain') {
    return segment ? `/${segment}` : '/';
  }

  // Path mode (beardly.com): always platform-level, never shop-prefixed.
  // The /shops/[slug]/* sub-routes exist but they are platform pages, not
  // a different nav context — so the nav links stay at the platform level.
  if (!segment) return '/shops';
  return `/${segment}`;
}

function getHomeHref(
  role: NavRole,
  shopSlug: string | null,
  mode: 'path' | 'custom_domain' | 'platform_subdomain',
) {
  if (role === 'admin') return '/admin';
  if (role === 'staff') return '/staff';
  if (mode === 'custom_domain' || mode === 'platform_subdomain') return '/';
  return '/';
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
    () => searchParams.get('shop')?.trim() || initialState.selectedWorkspaceSlug || null,
    [initialState.selectedWorkspaceSlug, searchParams],
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
  const [adminNotificationCount, setAdminNotificationCount] = useState<number | null>(null);
  const [adminNotificationItems, setAdminNotificationItems] = useState<
    AdminNotificationPreviewItem[]
  >([]);
  const [adminNotificationsLoading, setAdminNotificationsLoading] = useState(false);
  const [adminNotificationsError, setAdminNotificationsError] = useState<string | null>(null);
  const [hasWorkspaceAccess, setHasWorkspaceAccess] = useState(initialState.hasWorkspaceAccess);
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
      current === initialState.hasWorkspaceAccess ? current : initialState.hasWorkspaceAccess,
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
  const usesCondensedAdminNavigation = navigationContext === 'admin';
  const inlineHeaderContentClassName = usesCondensedAdminNavigation
    ? 'hidden min-[1700px]:flex'
    : 'hidden lg:flex';
  const collapsedMenuToggleClassName = usesCondensedAdminNavigation
    ? 'min-[1700px]:hidden'
    : 'lg:hidden';
  const headerActionVisibilityClassName = usesCondensedAdminNavigation
    ? 'hidden min-[1700px]:flex'
    : 'hidden lg:flex';
  const shouldRenderAdminSideMenu = usesCondensedAdminNavigation && isMenuOpen;
  const activeHeaderLinks = useMemo<HeaderLink[]>(() => {
    if (navigationContext === 'admin') {
      return adminHeaderLinks.map((item) => ({
        href: buildAdminHref(item.href, activeWorkspaceSlug),
        label: item.label,
        key: `${item.href}:${item.label}`,
      }));
    }

    if (navigationContext === 'staff') {
      return STAFF_NAV_ITEMS.map((item) => ({
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
        navigationContext === 'admin' ? 'admin' : navigationContext === 'staff' ? 'staff' : 'guest',
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
  const activeWorkspaceMeta = useMemo(() => {
    const normalizedSlug = activeWorkspaceSlug?.trim().toLowerCase();

    if (!normalizedSlug) {
      return null;
    }

    return (
      workspaceDirectory.find((workspace) => workspace.slug.toLowerCase() === normalizedSlug) ||
      null
    );
  }, [activeWorkspaceSlug, workspaceDirectory]);
  const activeWorkspaceId = activeWorkspaceMeta?.id || initialState.selectedWorkspaceId || null;
  const activeWorkspaceName = useMemo(() => {
    return activeWorkspaceMeta?.name || initialState.selectedWorkspaceName || null;
  }, [activeWorkspaceMeta, initialState.selectedWorkspaceName]);
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
  const adminNotificationsHref = useMemo(
    () => buildAdminHref('/admin/notifications', activeWorkspaceSlug),
    [activeWorkspaceSlug],
  );
  const effectiveNotificationCount =
    navigationContext === 'admin'
      ? Math.max(0, adminNotificationCount || 0)
      : pendingNotificationCount;
  const hasNewAdminNotifications = adminNotificationItems.some((item) => item.isNew);

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
    if (navigationContext !== 'admin' || role === 'guest' || !activeWorkspaceId) {
      setAdminNotificationCount(null);
      setAdminNotificationItems([]);
      setAdminNotificationsError(null);
      setAdminNotificationsLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadAdminNotificationCount = async () => {
      setAdminNotificationsLoading(true);
      setAdminNotificationsError(null);

      try {
        const response = await fetch(
          `/api/workspace/admin/notifications/summary?shop_id=${encodeURIComponent(activeWorkspaceId)}`,
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error('No se pudo cargar el conteo de notificaciones.');
        }

        const payload = (await response.json()) as {
          pending_count?: number;
          items?: AdminNotificationPreviewItem[];
        };
        const nextCount = Number(payload.pending_count || 0);
        setAdminNotificationCount(Number.isFinite(nextCount) ? Math.max(0, nextCount) : 0);
        setAdminNotificationItems(Array.isArray(payload.items) ? payload.items.slice(0, 10) : []);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error(error);
        setAdminNotificationCount(null);
        setAdminNotificationItems([]);
        setAdminNotificationsError('No se pudieron cargar las notificaciones.');
      } finally {
        if (!controller.signal.aborted) {
          setAdminNotificationsLoading(false);
        }
      }
    };

    void loadAdminNotificationCount();

    return () => {
      controller.abort();
    };
  }, [activeWorkspaceId, navigationContext, role]);

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
          navigationContext === 'admin'
            ? adminNotificationsHref
            : role === 'admin'
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
      adminNotificationsHref,
      applyTheme,
      handleSignOut,
      navigationContext,
      role,
      router,
      subscriptionHref,
      theme,
      workspaceHubHref,
    ],
  );

  return (
    <>
      <Navbar
      isBlurred={false}
      maxWidth="full"
      height="76px"
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      className="bg-transparent px-0 pt-0"
      classNames={{
        wrapper: 'glass-nav glass-navbar-wrapper mx-auto w-full max-w-none px-4 md:px-6 lg:px-8',
        menu: cn('mobile-nav-menu glass-navbar-menu', usesCondensedAdminNavigation && 'admin-nav-menu-hidden'),
      }}
    >
      <NavbarContent justify="start">
        <NavbarBrand className="h-full max-w-[10rem] min-w-0 items-center py-0 min-[360px]:max-w-[11rem] lg:w-[14rem] lg:max-w-none">
          <NextLink
            href={contextualHomeHref}
            className="flex h-full min-w-0 items-center no-underline lg:w-full"
          >
            <HeaderBrand />
          </NextLink>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className={inlineHeaderContentClassName} justify="center">
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
        {/* Back to Beardly platform — shown only on tenant subdomains/custom domains */}
        {navigationContext === 'public' &&
        (publicTenantMode === 'platform_subdomain' || publicTenantMode === 'custom_domain') ? (
          <NavbarItem className={headerActionVisibilityClassName}>
            <Button
              as="a"
              href={buildPlatformUrl('/shops')}
              variant="ghost"
              size="sm"
              className={actionButtonClassName}
              startContent={<ArrowLeft className="h-3.5 w-3.5" />}
            >
              Beardly
            </Button>
          </NavbarItem>
        ) : null}

        {!loading && role === 'guest' ? (
          <NavbarItem className={headerActionVisibilityClassName}>
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
          <NavbarItem className={headerActionVisibilityClassName}>
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

        {!loading && role !== 'guest' ? (
          <NavbarItem className={headerActionVisibilityClassName}>
            <Button
              as={NextLink}
              href={subscriptionHref}
              variant="ghost"
              size="sm"
              className={subscriptionButtonClassName}
              startContent={<CreditCard className="h-4 w-4" />}
            >
              Suscripcion
            </Button>
          </NavbarItem>
        ) : null}

        {!loading && role !== 'guest' && navigationContext === 'public' ? (
          <NavbarItem className={headerActionVisibilityClassName}>
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
          <NavbarItem className={headerActionVisibilityClassName}>
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

        {!loading && role !== 'guest' && navigationContext === 'admin' ? (
          <NavbarItem className="overflow-visible">
            <Popover placement="bottom-end" offset={14}>
              <PopoverTrigger>
                <Button
                  type="button"
                  isIconOnly
                  variant="light"
                  aria-label="Abrir notificaciones"
                  title="Notificaciones"
                  className={notificationTriggerClassName}
                >
                  <Bell className="h-4 w-4" />
                  {effectiveNotificationCount > 0 ? (
                    <span className="pointer-events-none absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-black">
                      {effectiveNotificationCount > 9 ? '9+' : effectiveNotificationCount}
                    </span>
                  ) : null}
                </Button>
              </PopoverTrigger>

              <PopoverContent className={notificationDropdownContentClassName}>
                <div className="flex max-h-[32rem] w-full flex-col">
                  <div className="border-b border-slate-200/80 px-4 py-4 dark:border-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          Notificaciones
                        </p>
                        <h3 className="mt-1 text-base font-semibold text-ink dark:text-slate-100">
                          Local activo
                        </h3>
                      </div>
                      <span
                        className="meta-chip"
                        data-tone={effectiveNotificationCount > 0 ? 'warning' : 'success'}
                      >
                        {effectiveNotificationCount > 0
                          ? `${effectiveNotificationCount} activas`
                          : 'Todo al dia'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">
                      {effectiveNotificationCount > adminNotificationItems.length &&
                      adminNotificationItems.length > 0
                        ? `Mostrando ${adminNotificationItems.length} de ${effectiveNotificationCount}.`
                        : 'Resumen rapido del inbox operativo del local.'}
                    </p>
                    {hasNewAdminNotifications ? (
                      <p className="mt-1 text-[11px] font-medium text-[hsl(var(--primary))] dark:text-[hsl(var(--primary))]">
                        Las alertas nuevas llevan un punto lila.
                      </p>
                    ) : null}
                  </div>

                  <div className="max-h-[24rem] space-y-2 overflow-y-auto p-3">
                    {adminNotificationsLoading ? (
                      <div className="admin-premium-subcard rounded-[1.3rem] px-4 py-5 text-sm text-slate-600 dark:text-slate-300">
                        Cargando notificaciones...
                      </div>
                    ) : adminNotificationsError ? (
                      <div className="rounded-[1.3rem] border border-rose-200/80 bg-rose-50/80 px-4 py-5 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                        {adminNotificationsError}
                      </div>
                    ) : adminNotificationItems.length === 0 ? (
                      <div className="admin-premium-subcard rounded-[1.3rem] px-4 py-5 text-sm text-slate-600 dark:text-slate-300">
                        No hay alertas activas por ahora.
                      </div>
                    ) : (
                      adminNotificationItems.map((item) => (
                        <NextLink
                          key={item.id}
                          href={`${adminNotificationsHref}#${item.targetId}`}
                          className={notificationPreviewLinkClassName}
                        >
                          <NotificationPreviewIcon kind={item.kind} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-ink dark:text-slate-100">
                                {item.title}
                              </p>
                              {item.isNew ? (
                                <>
                                  <span
                                    aria-hidden="true"
                                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-[hsl(var(--primary))] shadow-[0_0_0_4px_hsl(var(--primary)/0.18)]"
                                  />
                                  <span className="sr-only">Nueva notificacion</span>
                                </>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                              {item.detail}
                            </p>
                            <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                              {formatNotificationPreviewTime(item.createdAt)}
                            </p>
                          </div>
                          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[hsl(var(--primary))] dark:text-slate-500 dark:group-hover:text-[hsl(var(--primary))]" />
                        </NextLink>
                      ))
                    )}
                  </div>

                  <div className="border-t border-slate-200/80 p-3 dark:border-white/10">
                    <NextLink
                      href={adminNotificationsHref}
                      className="admin-premium-subcard flex items-center justify-between rounded-[1.15rem] px-4 py-3 text-sm font-semibold text-ink no-underline hover:border-[hsl(var(--primary)/0.28)] dark:text-slate-100 dark:hover:border-[hsl(var(--primary)/0.24)]"
                    >
                      <span>Abrir inbox</span>
                      <ChevronRight className="h-4 w-4" />
                    </NextLink>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </NavbarItem>
        ) : null}

        {!loading && role !== 'guest' ? (
          <NavbarItem>
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button
                  type="button"
                  isIconOnly
                  radius="full"
                  variant="light"
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
                  {navigationContext !== 'admin' && effectiveNotificationCount > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black">
                      {effectiveNotificationCount > 9 ? '9+' : effectiveNotificationCount}
                    </span>
                  ) : null}
                </Button>
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
                  {effectiveNotificationCount > 0 ? ` (${effectiveNotificationCount})` : ''}
                </DropdownItem>
                <DropdownItem key="account">Mi cuenta</DropdownItem>
                <DropdownItem key="subscription">Suscripcion</DropdownItem>
                {isPlatformAdmin ? (
                  <DropdownItem key="app-admin">Switch de suscripciones</DropdownItem>
                ) : null}
                <DropdownItem
                  key="theme-toggle"
                  startContent={
                    theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
                  }
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
              className="h-10 w-10 min-w-10 rounded-2xl border border-white/75 bg-white/58 p-0 text-ink shadow-[0_16px_24px_-20px_rgba(15,23,42,0.24)] transition data-[hover=true]:border-white/90 data-[hover=true]:bg-white/84 data-[hover=true]:text-violet-700 data-[pressed=true]:scale-100 data-[pressed=true]:bg-white/88 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:data-[hover=true]:bg-white/[0.08] dark:data-[hover=true]:text-violet-200"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </NavbarItem>
        ) : null}

        <NavbarItem className={collapsedMenuToggleClassName}>
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

        {navigationContext === 'public' &&
        (publicTenantMode === 'platform_subdomain' || publicTenantMode === 'custom_domain') ? (
          <NavbarMenuItem>
            <a
              href={buildPlatformUrl('/shops')}
              onClick={() => setIsMenuOpen(false)}
              className="nav-link-pill flex w-full items-center justify-start gap-2 no-underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Ir a Beardly
            </a>
          </NavbarMenuItem>
        ) : null}

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

        {!loading && role !== 'guest' && navigationContext === 'admin' ? (
          <NavbarMenuItem>
            <NextLink
              href={adminNotificationsHref}
              onClick={() => setIsMenuOpen(false)}
              className="nav-link-pill flex w-full justify-start no-underline"
            >
              Notificaciones
              {effectiveNotificationCount > 0 ? ` (${effectiveNotificationCount})` : ''}
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
      {shouldRenderAdminSideMenu ? (
        <div className="admin-nav-shell" aria-hidden={false}>
          <button
            type="button"
            aria-label="Cerrar menu lateral"
            className="admin-nav-backdrop"
            onClick={() => setIsMenuOpen(false)}
          />
          <aside className="admin-nav-panel" aria-label="Navegacion admin">
            <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/72 px-4 py-3 text-left shadow-[0_18px_30px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_18px_34px_-26px_rgba(0,0,0,0.44)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Panel admin
              </p>
              <p className="mt-1 text-sm font-semibold text-ink dark:text-slate-100">
                {activeWorkspaceLabel || 'Barberia activa'}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                Navegacion lateral para evitar overflow en escritorio intermedio.
              </p>
            </div>

            <nav className="mt-3 flex flex-col gap-2" aria-label="Secciones admin">
              {activeHeaderLinks.map((item) => {
                const isActive = item.href === activeHeaderHref;
                return (
                  <NextLink
                    key={`drawer:${item.key}`}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setIsMenuOpen(false)}
                    className="nav-link-pill flex w-full justify-start no-underline"
                    data-active={String(isActive)}
                  >
                    {item.label}
                  </NextLink>
                );
              })}

              <NextLink
                href={adminNotificationsHref}
                onClick={() => setIsMenuOpen(false)}
                className="nav-link-pill flex w-full justify-start no-underline"
              >
                Notificaciones
                {effectiveNotificationCount > 0 ? ` (${effectiveNotificationCount})` : ''}
              </NextLink>

              <NextLink
                href={subscriptionHref}
                onClick={() => setIsMenuOpen(false)}
                className="nav-link-pill flex w-full justify-start no-underline"
              >
                Suscripcion
              </NextLink>

              {hasMultipleWorkspaces ? (
                <NextLink
                  href={workspaceHubHref}
                  onClick={() => setIsMenuOpen(false)}
                  className="nav-link-pill flex w-full justify-start no-underline"
                >
                  Cambiar barberia
                </NextLink>
              ) : null}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
