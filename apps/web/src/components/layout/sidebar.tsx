'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  User,
  FileCheck,
  Award,
  GraduationCap,
  Building2,
  ClipboardList,
  BarChart3,
  Settings,
  Users,
  LogOut,
  ChevronLeft,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const roleNavItems: Record<string, NavItem[]> = {
  STUDENT: [
    { label: 'Dashboard', href: '/student/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Profile', href: '/student/profile', icon: <User size={20} /> },
    { label: 'Evidence', href: '/student/evidence', icon: <FileCheck size={20} /> },
    { label: 'Skills', href: '/student/skills', icon: <Award size={20} /> },
    { label: 'Drives', href: '/student/drives', icon: <Building2 size={20} /> },
    { label: 'Preparation', href: '/student/preparation', icon: <GraduationCap size={20} /> },
  ],
  FACULTY: [
    { label: 'Dashboard', href: '/faculty/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Reviews', href: '/faculty/reviews', icon: <ClipboardList size={20} /> },
    { label: 'Students', href: '/faculty/students', icon: <Users size={20} /> },
  ],
  PLACEMENT_OFFICER: [
    { label: 'Dashboard', href: '/placement/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Drives', href: '/placement/drives', icon: <Building2 size={20} /> },
    { label: 'Candidates', href: '/placement/candidates', icon: <Users size={20} /> },
    { label: 'Analytics', href: '/placement/analytics', icon: <BarChart3 size={20} /> },
  ],
  PLACEMENT_HEAD: [
    { label: 'Dashboard', href: '/placement/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Drives', href: '/placement/drives', icon: <Building2 size={20} /> },
    { label: 'Analytics', href: '/placement/analytics', icon: <BarChart3 size={20} /> },
  ],
  RECRUITER: [
    { label: 'Dashboard', href: '/recruiter/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Drives', href: '/recruiter/drives', icon: <Building2 size={20} /> },
  ],
  ADMIN: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Users', href: '/admin/users', icon: <Users size={20} /> },
    { label: 'Skills', href: '/admin/skills', icon: <Award size={20} /> },
    { label: 'Settings', href: '/admin/settings', icon: <Settings size={20} /> },
  ],
};

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = roleNavItems[user?.role ?? 'STUDENT'] ?? roleNavItems['STUDENT'] ?? [];

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md border border-[var(--color-border)] lg:hidden"
        aria-label="Toggle navigation"
      >
        <Menu size={20} />
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full bg-white border-r border-[var(--color-border)] z-40 flex flex-col transition-all duration-200',
          collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-[var(--color-border)]">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
            <GraduationCap size={18} className="text-white" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-[var(--color-primary)]">
              PlaceCampus
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]',
                )}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-[var(--color-border)] p-3 space-y-2">
          {/* User info */}
          {!collapsed && user && (
            <div className="px-3 py-2">
              <p className="text-sm font-medium truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-[var(--color-muted)] truncate">
                {user.role.replace('_', ' ')}
              </p>
            </div>
          )}

          {/* Collapse toggle (desktop) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--color-muted)] hover:bg-[var(--color-surface)] transition-colors"
          >
            <ChevronLeft
              size={20}
              className={cn('transition-transform', collapsed && 'rotate-180')}
            />
            {!collapsed && <span>Collapse</span>}
          </button>

          {/* Logout */}
          <button
            onClick={() => { void logout(); }}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] transition-colors"
          >
            <LogOut size={20} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
