"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect, usePathname } from "next/navigation";
import {
  Bell,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  Video,
  X,
} from "lucide-react";
import { UserRole } from "@placecampus/shared-types";
import { useAuth } from "@/features/auth/components/auth-provider";
import { SwitchRoleLink } from "@/features/auth/components/switch-role-link";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { useUnreadNotificationCount } from "@/features/notifications/hooks/use-notifications";
import { UserMenu } from "@/components/layout/user-menu";
import { initials } from "@/features/faculty/lib/faculty-meta";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/faculty/dashboard", icon: LayoutDashboard },
  { name: "Evidence Review", href: "/faculty/reviews", icon: FileCheck2 },
  { name: "Interviews", href: "/faculty/interviews", icon: Video },
  { name: "My Students", href: "/faculty/students", icon: Users },
  { name: "Notifications", href: "/faculty/notifications", icon: Bell, badge: "unread" as const },
  { name: "Settings", href: "/faculty/settings", icon: Settings },
];

const PAGE_TITLES: [string, string][] = [
  ["/faculty/dashboard", "Faculty Dashboard"],
  ["/faculty/reviews", "Evidence Review"],
  ["/faculty/interviews", "Interviews"],
  ["/faculty/students", "My Students"],
  ["/faculty/notifications", "Notifications"],
  ["/faculty/settings", "Settings"],
];

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  const { user, authenticated, loading, clearAuth } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const pathname = usePathname();
  const unread = useUnreadNotificationCount().data?.count ?? 0;

  // Route protection
  React.useEffect(() => {
    if (!loading && !authenticated) redirect("/login");
    if (!loading && authenticated && user?.role !== UserRole.FACULTY && user?.role !== UserRole.ADMIN) {
      redirect("/");
    }
  }, [loading, authenticated, user]);

  if (loading || !authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#FF6B1A]" />
      </div>
    );
  }

  const name = user?.fullName || "Faculty";
  const subtitle = [user?.designation, user?.department && `${user.department} Department`].filter(Boolean);
  const title = pathname === "/faculty/dashboard"
    ? null
    : PAGE_TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? "Faculty Portal";
  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-[#E5E7EB] bg-white transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#E5E7EB] px-5">
          <Link href="/faculty/dashboard" aria-label="PlaceCampus faculty home" onClick={closeMenu}>
            <Image src="/images/placecampus-logo-trimmed.png" alt="PlaceCampus" width={1200} height={269} priority className="h-auto w-[150px]" />
          </Link>
          <button type="button" onClick={closeMenu} aria-label="Close menu" className="rounded-lg p-1.5 text-[#64748B] hover:bg-slate-100 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Faculty navigation" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMenu}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition-colors",
                  active ? "bg-[#FF6B1A] text-white shadow-[0_8px_18px_-10px_rgba(255,107,26,0.9)]" : "text-[#0B1F44]/80 hover:bg-orange-50 hover:text-[#0B1F44]",
                )}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                {item.name}
                {item.badge === "unread" && unread > 0 && (
                  <span className={cn("ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold", active ? "bg-white text-[#FF6B1A]" : "bg-[#FF6B1A] text-white")}>
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#E5E7EB] p-3">
          <SwitchRoleLink />
          <div aria-hidden="true" className="my-3 border-t border-[#E5E7EB]" />
          <div className="flex items-center gap-3 px-1 py-2">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FF6B1A]/12 text-base font-bold text-[#FF6B1A]">
              {initials(name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#0B1F44]">{name}</p>
              {subtitle.length ? (
                subtitle.map((line) => (
                  <p key={line} className="truncate text-xs leading-snug text-[#64748B]">{line}</p>
                ))
              ) : (
                <p className="text-xs text-[#64748B]">Faculty</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => clearAuth()}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium text-[#0B1F44]/80 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Logout
          </button>
        </div>
      </aside>

      {isMobileMenuOpen && <div className="fixed inset-0 z-30 bg-[#0B1F44]/25 lg:hidden" onClick={closeMenu} aria-hidden="true" />}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[#E5E7EB] bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button type="button" onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu" className="-ml-1 rounded-lg p-2 text-[#0B1F44] hover:bg-slate-100 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          {title ? (
            <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-[#0B1F44] sm:text-2xl">{title}</h1>
          ) : (
            <span className="min-w-0 flex-1" aria-hidden="true" />
          )}
          <NotificationBell inboxHref="/faculty/notifications" variant="link" />
          <span aria-hidden="true" className="hidden h-8 w-px bg-[#E5E7EB] sm:block" />
          <UserMenu
            name={name}
            roleLabel={user?.designation || "Faculty"}
            compact
            switchRoleHref={(user?.roles?.length ?? 0) > 1 ? "/select-role" : undefined}
            onLogout={() => clearAuth()}
          />
        </header>

        <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
