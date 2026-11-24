"use client";

import * as React from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { redirect, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  BriefcaseBusiness,
  ChevronDown,
  UsersRound,
  Star,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserRole } from "@placecampus/shared-types";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { useRecruiterDashboardStats } from "@/features/recruiter/hooks/use-recruiter-portal";

const navigation = [
  { name: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard },
  { name: "Assigned Drives", href: "/recruiter/drives", icon: BriefcaseBusiness },
  { name: "Candidates", href: "/recruiter/candidates", icon: UsersRound },
  { name: "Shortlists", href: "/recruiter/shortlists", icon: Star },
  { name: "Interviews", href: "/recruiter/interviews", icon: CalendarClock },
  { name: "Analytics & Reports", href: "/recruiter/analytics", icon: BarChart3 },
  { name: "Settings", href: "/recruiter/settings", icon: Settings },
];

export default function RecruiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, authenticated, loading, clearAuth } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const pathname = usePathname();
  const demoStatus = useRecruiterDashboardStats();

  React.useEffect(() => {
    if (!loading && !authenticated) {
      redirect("/recruiter/login");
    }
    if (
      !loading &&
      authenticated &&
      user?.role !== UserRole.RECRUITER &&
      user?.role !== UserRole.ADMIN
    ) {
      redirect("/");
    }
  }, [loading, authenticated, user]);

  if (loading || !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]"></div>
      </div>
    );
  }

  const handleLogout = () => {
    clearAuth();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };
  const currentPage = navigation.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.name ?? "Recruiter Portal";

  return (
    <div className="min-h-screen bg-[#f7f8fa] md:flex">
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <Link
          href="/recruiter/dashboard"
          aria-label="PlaceCampus recruiter dashboard"
          className="flex items-center"
        >
          <Image src="/images/placecampus-logo-trimmed.png" alt="PlaceCampus" width={1200} height={269} priority className="h-8 w-auto object-contain" />
        </Link>
        <div className="flex items-center gap-1"><NotificationBell inboxHref="/recruiter/notifications" /><button aria-label={isMobileMenuOpen ? "Close navigation" : "Open navigation"} aria-expanded={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100">{isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button></div>
      </div>

      {isMobileMenuOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/25 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

      <nav
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-slate-200 bg-white transition-all duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed && "md:w-[76px]",
        )}
      >
        <div className={cn("hidden h-[76px] items-center border-b border-slate-100 px-5 md:flex", isCollapsed && "justify-center px-2")}>
          <Link
            href="/recruiter/dashboard"
            aria-label="PlaceCampus recruiter dashboard"
            className="flex min-w-0 items-center"
          >
            <Image src="/images/placecampus-logo-trimmed.png" alt="PlaceCampus" width={1200} height={269} priority className={cn("h-9 w-auto object-contain", isCollapsed && "h-7 max-w-[52px] object-left")}/>
          </Link>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                  isCollapsed && "md:justify-center md:px-2",
                  isActive
                    ? "bg-[#fff0e8] text-[#e9570c]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-[#142b4d]",
                )}
                onClick={() => { if (isMobileMenuOpen) setIsMobileMenuOpen(false); }}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span className={cn(isCollapsed && "md:hidden")}>{item.name}</span>
              </Link>
            );
          })}
        </div>

        <div className="border-t border-slate-100 p-3 md:hidden">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
          >
            <LogOut className="h-[18px] w-[18px]" /> Logout
          </button>
        </div>

        <div className={cn("hidden border-t border-slate-100 p-3 md:block", isCollapsed && "px-2")}>
          <div className={cn("mb-2 flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 p-2", isCollapsed && "justify-center")} title={isCollapsed ? user?.fullName || "Recruiter" : undefined}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-800">{getInitials(user?.fullName || "Recruiter")}</span>
            <div className={cn("min-w-0", isCollapsed && "hidden")}><p className="truncate text-xs font-semibold text-[#142b4d]">{user?.fullName || "Recruiter"}</p><p className="text-[11px] text-slate-500">Recruiter account</p></div>
          </div>
          <button onClick={handleLogout} title={isCollapsed ? "Log out" : undefined} className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50", isCollapsed && "justify-center px-2")}>
            <LogOut className="h-4 w-4 shrink-0" /><span className={cn(isCollapsed && "hidden")}>Log out</span>
          </button>
        </div>
      </nav>

      <main className="flex min-h-screen min-w-0 flex-1 flex-col bg-[#f7f8fa]">
        <header className="sticky top-0 z-30 hidden min-h-[68px] items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-2 backdrop-blur md:flex">
          <div className="flex items-center gap-3"><button type="button" onClick={() => setIsCollapsed(!isCollapsed)} aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#142b4d]">{isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</button><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Recruiter / {currentPage}</p><p className="text-sm font-semibold text-[#142b4d]">{currentPage}</p></div></div>
          <div className="flex items-center gap-3">
            <NotificationBell inboxHref="/recruiter/notifications" />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl p-1.5 pr-2 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b1a]/30">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-xs font-bold text-[#e9570c]">{getInitials(user?.fullName || "Recruiter")}</span>
                <span className="max-w-36 truncate text-sm font-semibold text-[#142b4d]">{user?.fullName || "Recruiter"}</span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl bg-white p-1.5">
                <div className="px-2.5 py-2">
                  <p className="truncate text-sm font-semibold text-[#142b4d]">{user?.fullName || "Recruiter"}</p>
                  <p className="text-xs text-slate-500">Recruiter</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/recruiter/settings">Account settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/recruiter/notifications">Notifications</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleLogout} className="text-rose-600 focus:text-rose-600">
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          {demoStatus.data?.demoMode && <div role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">DEMO ENVIRONMENT — Displaying fictional placement and student records for demonstration purposes.</div>}
          {children}
        </div>
      </main>
    </div>
  );
}
