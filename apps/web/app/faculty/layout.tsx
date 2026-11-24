"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect, usePathname, useRouter } from "next/navigation";
import {
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
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/faculty/dashboard", icon: LayoutDashboard },
  { name: "Evidence Review", href: "/faculty/reviews", icon: FileCheck2 },
  { name: "Interviews", href: "/faculty/interviews", icon: Video },
  { name: "My Students", href: "/faculty/students", icon: Users },
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
  const router = useRouter();

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

  // The interview room is full-screen: no portal chrome. Only faculty may run interviews.
  if (pathname.startsWith("/faculty/interviews/room/")) {
    return user?.role === UserRole.FACULTY ? <>{children}</> : null;
  }

  const name = user?.fullName || "Faculty";
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

        <nav aria-label="Faculty navigation" className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-5">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMenu}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-medium transition-colors",
                  active ? "bg-[#FF6500] font-semibold text-white shadow-[0_10px_22px_-12px_rgba(255,101,0,0.9)]" : "text-[#10264A]/80 hover:bg-[#FFF1E8] hover:text-[#10264A]",
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#E5E7EB] p-3">
          <button
            type="button"
            onClick={() => { clearAuth(); router.replace("/login"); }}
            className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-semibold text-[#B54735] transition hover:bg-[#FFF3F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            <LogOut className="h-[17px] w-[17px]" aria-hidden="true" />Logout
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
