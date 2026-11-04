"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect, usePathname } from "next/navigation";
import {
  Bell,
  ClipboardCheck,
  FileSpreadsheet,
  LayoutDashboard,
  LineChart,
  Menu,
  Settings,
  ShieldAlert,
  Tags,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { UserRole } from "@placecampus/shared-types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/components/auth-provider";
import { SwitchRoleLink } from "@/features/auth/components/switch-role-link";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { useUnreadNotificationCount } from "@/features/notifications/hooks/use-notifications";
import { UserMenu } from "@/components/layout/user-menu";

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Institutional Analytics", href: "/admin/analytics", icon: LineChart },
  { name: "Bulk Imports", href: "/admin/imports", icon: FileSpreadsheet },
  { name: "Faculty Assignments", href: "/admin/assignments", icon: UserCog },
  { name: "Review Queue", href: "/admin/reviews", icon: ClipboardCheck },
  { name: "Notifications", href: "/admin/notifications", icon: Bell, badge: "unread" as const },
  { name: "User Management", href: "/admin/users", icon: Users, comingSoon: true },
  { name: "Skills Taxonomy", href: "/admin/taxonomy", icon: Tags, comingSoon: true },
  { name: "System Configuration", href: "/admin/settings", icon: Settings, comingSoon: true },
  { name: "Audit Logs", href: "/admin/logs", icon: ShieldAlert, comingSoon: true },
];

const pageTitles: [string, string][] = [
  ["/admin/dashboard", "Admin Dashboard"],
  ["/admin/analytics", "Institutional Analytics"],
  ["/admin/imports", "Bulk Imports"],
  ["/admin/assignments", "Faculty Assignments"],
  ["/admin/reviews", "Review Queue"],
  ["/admin/notifications", "Notifications"],
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, authenticated, loading, clearAuth } = useAuth();
  const unread = useUnreadNotificationCount().data?.count ?? 0;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    if (!loading && !authenticated) redirect("/login");
    if (!loading && authenticated && user?.role !== UserRole.ADMIN) redirect("/");
  }, [loading, authenticated, user]);

  if (loading || !authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[hsl(var(--primary))]" />
      </div>
    );
  }

  const closeMenu = () => setIsMobileMenuOpen(false);
  const name = user?.fullName || "System Admin";
  const title = pageTitles.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? "Admin Portal";

  return (
    <div className="flex min-h-screen bg-[hsl(var(--background))]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-[hsl(var(--border))] bg-white transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-[hsl(var(--border))] px-5">
          <Link href="/admin/dashboard" aria-label="PlaceCampus admin home" onClick={closeMenu}>
            <Image src="/images/placecampus-logo-trimmed.png" alt="PlaceCampus" width={1200} height={269} priority className="h-auto w-[150px]" />
          </Link>
          <button type="button" onClick={closeMenu} aria-label="Close navigation" className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Admin navigation" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const classes = cn(
              "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[15px] font-medium transition-colors",
              active ? "bg-[hsl(var(--primary))] text-white shadow-[0_8px_18px_-10px_hsl(var(--primary))]" : "text-[hsl(var(--foreground)/0.8)] hover:bg-[hsl(var(--primary)/0.08)] hover:text-[hsl(var(--foreground))]",
            );
            if (item.comingSoon) {
              return (
                <button key={item.name} type="button" disabled aria-disabled="true" className={cn(classes, "cursor-not-allowed opacity-50")}>
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.name}</span>
                  <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide">Soon</span>
                </button>
              );
            }
            return (
              <Link key={item.name} href={item.href} onClick={closeMenu} aria-current={active ? "page" : undefined} className={classes}>
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.name}</span>
                {item.badge === "unread" && unread > 0 && (
                  <span className={cn("ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold", active ? "bg-white text-[hsl(var(--primary))]" : "bg-[hsl(var(--primary))] text-white")}>
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[hsl(var(--border))] p-3">
          <SwitchRoleLink />
          <div aria-hidden="true" className="my-3 border-t border-[hsl(var(--border))]" />
          <div className="flex items-center gap-3 px-1 py-2">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.12)] text-base font-bold text-[hsl(var(--primary))]">
              {getInitials(name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-heading">{name}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">System Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {isMobileMenuOpen && <div className="fixed inset-0 z-30 bg-[hsl(var(--foreground)/0.2)] lg:hidden" onClick={closeMenu} aria-hidden="true" />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[hsl(var(--border))] bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:h-[72px] lg:px-8">
          <button type="button" onClick={() => setIsMobileMenuOpen(true)} aria-label="Open navigation" aria-expanded={isMobileMenuOpen} className="-ml-1 rounded-lg p-2 text-heading hover:bg-[hsl(var(--muted))] lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-heading sm:text-2xl">{title}</h1>
          <NotificationBell inboxHref="/admin/notifications" variant="link" />
          <span aria-hidden="true" className="hidden h-8 w-px bg-[hsl(var(--border))] sm:block" />
          <UserMenu name={name} roleLabel="System Admin" compact switchRoleHref={(user?.roles?.length ?? 0) > 1 ? "/select-role" : undefined} onLogout={() => clearAuth()} />
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}
