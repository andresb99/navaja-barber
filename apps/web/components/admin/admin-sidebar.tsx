'use client';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo, type Key } from 'react';
import {
  Activity,
  Calendar,
  Scissors,
  Users,
  LineChart,
  Book,
  Briefcase,
  Camera,
  Bell,
  Settings,
  ChevronRight,
  User,
  CreditCard,
  PlusCircle,
  LogOut,
  LayoutGrid,
} from 'lucide-react';
import { 
  Dropdown, 
  DropdownTrigger, 
  DropdownMenu, 
  DropdownItem,
  Avatar 
} from '@heroui/react';
import { HeaderBrand } from '@/components/public/header-brand';
import { buildAdminHref } from '@/lib/workspace-routes';
import { buildPlatformUrl } from '@/lib/shop-links';

interface AdminSidebarProps {
  workspaceName?: string | null;
  workspacePlan?: string;
  userProfileName?: string | null;
  userEmail?: string | null;
  userAvatarUrl?: string | null;
  unreadNotifications?: number;
  role: 'admin' | 'staff' | 'user';
  activeWorkspaceSlug: string | null;
  isPlatformAdmin: boolean;
}

export function AdminSidebar({
  workspaceName = 'Barbería Rivera',
  workspacePlan = 'Plan Pro - Centro',
  userProfileName = 'Lucas Medina',
  userEmail = 'admin@rivera.uy',
  userAvatarUrl,
  unreadNotifications = 4,
  role,
  activeWorkspaceSlug,
  isPlatformAdmin,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { label: 'Resumen', href: '/admin', icon: Activity },
    { label: 'Agenda', href: '/admin/appointments', icon: Calendar },
    { label: 'Servicios', href: '/admin/services', icon: Scissors },
    { label: 'Equipo', href: '/admin/staff', icon: Users },
    { label: 'Métricas', href: '/admin/metrics', icon: LineChart },
    { label: 'Cursos', href: '/admin/courses', icon: Book },
    { label: 'Trabajos', href: '/admin/barbershop/gallery', icon: Briefcase },
    { label: 'Modelos', href: '/admin/modelos', icon: Camera },
    { label: 'Notificaciones', href: '/admin/notifications', icon: Bell, badge: unreadNotifications },
    { label: 'Barbería', href: '/admin/barbershop', icon: Settings },
  ];

  const adminNotificationsHref = useMemo(
    () => buildAdminHref('/admin/notifications', activeWorkspaceSlug),
    [activeWorkspaceSlug],
  );

  const subscriptionHref = useMemo(() => {
    if (!activeWorkspaceSlug) return '/suscripcion';
    return `/suscripcion?shop=${encodeURIComponent(activeWorkspaceSlug)}`;
  }, [activeWorkspaceSlug]);

  const handleSignOut = useCallback(() => {
    window.location.assign(`/auth/logout?next=${encodeURIComponent('/')}`);
  }, []);

  const handleAvatarAction = useCallback(
    (key: Key) => {
      const action = String(key);

      if (action === 'account') {
        router.push('/cuenta');
        return;
      }

      if (action === 'notifications') {
        router.push(adminNotificationsHref);
        return;
      }

      if (action === 'workspaces') {
        window.location.assign(buildPlatformUrl('/mis-barberias'));
        return;
      }

      if (action === 'app-admin') {
        window.location.assign(buildPlatformUrl('/app-admin/subscriptions'));
        return;
      }

      if (action === 'subscription') {
        router.push(subscriptionHref);
        return;
      }

      if (action === 'create-shop') {
        window.location.assign(buildPlatformUrl('/onboarding/barbershop'));
        return;
      }

      if (action === 'logout') {
        void handleSignOut();
      }
    },
    [adminNotificationsHref, handleSignOut, router, subscriptionHref],
  );

  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-white/5 bg-[#0f0d14] py-8 lg:flex shrink-0">
      <div className="px-6 pb-6">
        <NextLink href="/" className="mb-10 block max-w-28 text-white">
          <HeaderBrand />
        </NextLink>

        <div className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-slate-500 uppercase">
          WORKSPACE
        </div>
        <button 
          onClick={() => window.location.assign(buildPlatformUrl('/mis-barberias'))}
          className="flex w-full items-center justify-between rounded-[1rem] bg-white/[0.04] p-3 text-left transition hover:bg-white/[0.06] border border-white/[0.05]"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-[10px] bg-gradient-to-tr from-[#9974ff] to-[#d8c5ff]" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-200">{workspaceName}</div>
              <div className="truncate text-[11px] font-medium text-slate-500">{workspacePlan}</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </button>
      </div>

      <nav className="flex-1 space-y-1.5 px-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <NextLink
              key={item.href}
              href={item.href}
              className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${
                isActive
                  ? 'bg-white/5 text-[#d0bcff] border border-white/5 shadow-sm'
                  : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? 'text-[#d0bcff]' : 'text-slate-500 group-hover:text-slate-400'
                  }`}
                />
                {item.label}
              </div>
              {item.badge && item.badge > 0 ? (
                <span className="flex h-5 items-center justify-center rounded-full bg-white/5 px-2 text-[10px] font-bold text-slate-300">
                  {item.badge}
                </span>
              ) : null}
            </NextLink>
          );
        })}
      </nav>

      <div className="mt-auto px-4 pt-4">
        <Dropdown placement="top-start" classNames={{ content: 'bg-[#1a1820] border border-white/10 text-white min-w-[220px]' }}>
          <DropdownTrigger>
            <button className="flex w-full items-center gap-3 rounded-[1rem] border border-white/5 bg-white/[0.02] p-3 text-left transition hover:bg-white/[0.04] outline-none">
              <Avatar 
                src={userAvatarUrl || undefined} 
                name={userProfileName || undefined}
                className="h-9 w-9 text-xs font-bold"
                classNames={{ base: 'bg-gradient-to-tr from-rose-400 to-amber-300 shadow-inner' }}
              />
              <div className="min-w-0 flex-1 text-white">
                <div className="truncate text-sm font-semibold">{userProfileName}</div>
                <div className="truncate text-[11px] text-slate-500">{userEmail}</div>
              </div>
            </button>
          </DropdownTrigger>
          <DropdownMenu aria-label="Acciones de perfil" onAction={handleAvatarAction} className="p-2">
            <DropdownItem key="account" startContent={<User className="h-4 w-4" />} className="rounded-lg h-10">
              Mi cuenta
            </DropdownItem>
            <DropdownItem key="notifications" startContent={<Bell className="h-4 w-4" />} className="rounded-lg h-10">
              Notificaciones ({unreadNotifications})
            </DropdownItem>
            <DropdownItem key="subscription" startContent={<CreditCard className="h-4 w-4" />} className="rounded-lg h-10">
              Suscripcion
            </DropdownItem>
            <DropdownItem key="create-shop" startContent={<PlusCircle className="h-4 w-4" />} className="rounded-lg h-10">
              Crear barberia
            </DropdownItem>
            <DropdownItem key="workspaces" startContent={<LayoutGrid className="h-4 w-4" />} className="rounded-lg h-10 border-t border-white/5 mt-1 pt-3">
              Mis barberias
            </DropdownItem>
            {isPlatformAdmin ? (
              <DropdownItem key="app-admin" className="rounded-lg h-10">
                App Admin
              </DropdownItem>
            ) : null}
            <DropdownItem key="logout" className="text-rose-400 hover:!text-rose-400 rounded-lg h-10" startContent={<LogOut className="h-4 w-4 text-rose-400" />}>
              Salir
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </aside>
  );
}
