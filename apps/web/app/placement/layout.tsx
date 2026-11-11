'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Send,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/features/auth/components/auth-provider';
import { SwitchRoleLink } from '@/features/auth/components/switch-role-link';
import { redirect } from 'next/navigation';
import { UserRole } from '@placecampus/shared-types';
import { NotificationBell } from '@/features/notifications/components/notification-bell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const navigation = [
  { label: 'Dashboard', href: '/placement/dashboard', icon: LayoutDashboard },
  { label: 'Placement Drives', href: '/placement/drives', icon: BriefcaseBusiness },
  { label: 'Eligible Students', href: '/placement/eligible-students', icon: Users },
  { label: 'Applications', href: '/placement/applications', icon: Send },
  { label: 'Settings', href: '/placement/settings', icon: Settings },
];

export default function PlacementLayout({ children }: { children: React.ReactNode }) {
  const { user, authenticated, loading, clearAuth } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  React.useEffect(() => {
    if (!loading && !authenticated) redirect('/login');
    if (
      !loading &&
      authenticated &&
      user?.role !== UserRole.PLACEMENT_OFFICER &&
      user?.role !== UserRole.ADMIN
    )
      redirect('/');
  }, [loading, authenticated, user]);
  const initials = (user?.fullName || 'Placement Officer')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const current = navigation.find(
    (item) => item.href !== '#' && (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  ) ?? (pathname.startsWith('/placement/notifications') ? { label: 'Notifications' } : undefined);
  // Third breadcrumb level for the drive sub-pages.
  const driveCrumb =
    pathname === '/placement/drives/new'
      ? 'Create Drive'
      : /^\/placement\/drives\/[^/]+\/edit$/.test(pathname)
        ? 'Edit Drive'
        : /^\/placement\/drives\/[^/]+$/.test(pathname)
          ? 'Drive Details'
          : null;

  if (loading || !authenticated)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa]">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#ff5a1f]" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#172b4d] md:flex">
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/25 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-[#e5e7eb] bg-white transition-[width,transform] duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0',
          collapsed && 'md:w-[84px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div
          className={cn(
            'flex h-[76px] items-center border-b border-[#eef0f2] px-5',
            collapsed && 'md:justify-center md:px-3',
          )}
        >
          <Link
            href="/placement/dashboard"
            aria-label="PlaceCampus dashboard"
            className="flex min-w-0 items-center"
          >
            <Image
              src="/images/placecampus-logo-trimmed.png"
              alt="PlaceCampus"
              width={1200}
              height={269}
              priority
              className={cn('h-9 w-auto object-contain', collapsed && 'md:hidden')}
            />
            <span
              className={cn(
                'hidden text-xl font-extrabold tracking-tight',
                collapsed && 'md:block',
              )}
            >
              P<span className="text-[#ff5a1f]">C</span>
            </span>
          </Link>
          <button
            aria-label="Close navigation"
            className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <button
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto hidden rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#172b4d] md:block"
          >
            <span className="sr-only">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav
          aria-label="Placement navigation"
          className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
        >
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            const content = (
              <>
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className={cn('truncate', collapsed && 'md:hidden')}>{label}</span>
              </>
            );
            return (
              <Link
                key={label}
                href={href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? label : undefined}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                  active
                    ? 'bg-[#fff2ec] text-[#f15a24]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-[#172b4d]',
                  collapsed && 'md:justify-center md:px-0',
                )}
              >
                {content}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#eef0f2] p-3">
          <div className={cn('mb-2', collapsed && 'md:hidden')}>
            <SwitchRoleLink />
          </div>
          <div
            className={cn(
              'mb-2 flex items-center gap-3 rounded-xl px-3 py-2',
              collapsed && 'md:justify-center md:px-0',
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff0e9] text-sm font-bold text-[#f15a24]">
              {initials}
            </div>
            <div className={cn('min-w-0', collapsed && 'md:hidden')}>
              <p className="truncate text-sm font-semibold text-[#172b4d]">
                {user?.fullName || 'Placement Officer'}
              </p>
              <p className="text-xs text-slate-500">Placement Officer</p>
            </div>
          </div>
          <button
            onClick={() => void clearAuth()}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50',
              collapsed && 'md:justify-center md:px-0',
            )}
            title={collapsed ? 'Log out' : undefined}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className={cn(collapsed && 'md:hidden')}>Log out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[68px] shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden items-center gap-2 text-sm sm:flex">
              <Link className="text-slate-500 hover:text-[#f15a24]" href="/placement/dashboard">
                Placement
              </Link>
              <ChevronRight className="h-4 w-4 text-slate-400" />
              {driveCrumb ? (
                <>
                  <Link className="text-slate-500 hover:text-[#f15a24]" href="/placement/drives">
                    Placement Drives
                  </Link>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                  <span aria-current="page" className="truncate font-medium text-[#172b4d]">{driveCrumb}</span>
                </>
              ) : (
                <span className="truncate font-medium text-[#172b4d]">
                  {current?.label || 'Placement'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell inboxHref="/placement/notifications" />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl p-1.5 pr-2 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a1f]/30">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff0e9] text-xs font-bold text-[#f15a24]">
                  {initials}
                </span>
                <span className="hidden max-w-36 truncate text-sm font-medium sm:block">
                  {user?.fullName || 'Placement Officer'}
                </span>
                <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl bg-white p-1.5">
                <div className="px-2.5 py-2">
                  <p className="truncate text-sm font-semibold">
                    {user?.fullName || 'Placement Officer'}
                  </p>
                  <p className="text-xs text-slate-500">Placement Officer</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/placement/notifications">Notifications</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => void clearAuth()}
                  className="text-rose-600 focus:text-rose-600"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1440px] animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
