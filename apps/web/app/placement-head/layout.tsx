"use client";

import * as React from "react";
import { SwitchRoleLink } from "@/features/auth/components/switch-role-link";
import { useAuth } from "@/features/auth/components/auth-provider";
import { redirect, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  LineChart,
  BarChart,
  Building,
  Award,

  ChevronDown,
  Settings,
  LogOut,
  Menu,
  X,
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

const navigation = [
  {
    name: "Dashboard",
    href: "/placement-head/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Institutional Analytics",
    href: "/placement-head/analytics",
    icon: LineChart,
  },
  {
    name: "Institution Readiness",
    href: "/placement-head/readiness",
    icon: BarChart,
  },
  {
    name: "Department Comparison",
    href: "/placement-head/departments",
    icon: Building,
  },
  {
    name: "Placement Outcomes",
    href: "/placement-head/outcomes",
    icon: Award,
  },
  {
    name: "Settings",
    href: "/placement-head/settings",
    icon: Settings,
  },
];

export default function PlacementHeadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, authenticated, loading, clearAuth } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !authenticated) {
      redirect("/login");
    }
    if (
      !loading &&
      authenticated &&
      user?.role !== UserRole.PLACEMENT_HEAD &&
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
    router.replace("/login");
  };

  const currentPage =
    navigation.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.name ?? "Placement Head";

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col md:flex-row">
      <div className="md:hidden flex items-center justify-between p-4 border-b border-[hsl(var(--border))] bg-white/50 backdrop-blur-md sticky top-0 z-30">
        <Link
          href="/placement-head/dashboard"
          aria-label="PlaceCampus placement head dashboard"
          className="flex items-center"
        >
          <Image src="/images/placecampus-logo-trimmed.png" alt="PlaceCampus" width={1200} height={269} priority className="h-8 w-auto object-contain" />
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-[hsl(var(--muted-foreground))] hover:text-heading"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      <nav
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-[hsl(var(--border))] bg-white transform transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="hidden h-[68px] items-center border-b border-slate-200 px-5 md:flex">
          <Link
            href="/placement-head/dashboard"
            aria-label="PlaceCampus placement head dashboard"
            className="flex min-w-0 items-center"
          >
            <Image src="/images/placecampus-logo-trimmed.png" alt="PlaceCampus" width={1200} height={269} priority className="h-9 w-auto object-contain" />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                  isActive
                    ? "bg-[#FFF0E6] font-semibold text-[#E25A00]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-[#10264A]",
                )}
                onClick={() => {
                  if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                }}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="space-y-2 border-t border-[hsl(var(--border))] p-3">
          <SwitchRoleLink />
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-semibold text-[#B54735] transition hover:bg-[#FFF3F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            <LogOut className="h-[17px] w-[17px]" aria-hidden="true" />Logout
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col min-w-0 bg-[#f8f9fa]">
        <header className="sticky top-0 z-30 hidden min-h-[68px] items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-2 backdrop-blur md:flex">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Placement Head</p>
            <p className="text-sm font-semibold text-[#10264A]">{currentPage}</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell inboxHref="/placement-head/notifications" />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl p-1.5 pr-2 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6500]/30">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-xs font-bold text-[#E25A00]">
                  {getInitials(user?.fullName || "Placement Head")}
                </span>
                <span className="hidden min-w-0 text-left lg:block">
                  <span className="block max-w-40 truncate text-sm font-semibold text-[#10264A]">{user?.fullName || "Placement Head"}</span>
                  <span className="block text-xs text-slate-500">Placement Head</span>
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl bg-white p-1.5">
                <div className="px-2.5 py-2">
                  <p className="truncate text-sm font-semibold text-[#10264A]">{user?.fullName || "Placement Head"}</p>
                  <p className="text-xs text-slate-500">Placement Head</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/placement-head/notifications">Notifications</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleLogout} className="text-rose-600 focus:text-rose-600">
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">{children}</div>
      </main>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
