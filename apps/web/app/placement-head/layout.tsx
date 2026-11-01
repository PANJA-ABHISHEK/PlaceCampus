"use client";

import * as React from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { redirect, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  LineChart,
  BarChart,
  Building,
  Award,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  { name: "Notifications", href: "/placement-head/notifications", icon: Bell },
  {
    name: "Institution Readiness",
    href: "/placement-head/readiness",
    icon: BarChart,
    comingSoon: true,
  },
  {
    name: "Department Comparison",
    href: "/placement-head/departments",
    icon: Building,
    comingSoon: true,
  },
  {
    name: "Placement Outcomes",
    href: "/placement-head/outcomes",
    icon: Award,
    comingSoon: true,
  },
  {
    name: "Settings",
    href: "/placement-head/settings",
    icon: Settings,
    comingSoon: true,
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
  };

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
          className="text-xl font-bold tracking-tighter text-heading"
        >
          Place<span className="text-[hsl(var(--primary))]">Campus</span>
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
          "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[hsl(var(--border))] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="p-6 hidden md:block border-b border-[hsl(var(--border))]">
          <Link
            href="/placement-head/dashboard"
            className="text-2xl font-bold tracking-tighter text-heading"
          >
            Place<span className="text-[hsl(var(--primary))]">Campus</span>
          </Link>
        </div>

        <div className="p-4 border-b border-[hsl(var(--border))] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center font-bold">
            {getInitials(user?.fullName || "Placement Head")}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-heading truncate">
              {user?.fullName}
            </span>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              Placement Head
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.comingSoon ? "#" : item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors relative group",
                  isActive
                    ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.5)] hover:text-heading",
                  item.comingSoon && "opacity-60 cursor-not-allowed",
                )}
                onClick={(e) => {
                  if (item.comingSoon) e.preventDefault();
                  if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                }}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
                {item.comingSoon && (
                  <span className="absolute right-2 text-[10px] bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-[hsl(var(--border))]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col min-w-0 bg-[#f8f9fa]">
        <header className="hidden md:flex items-center justify-between p-6 border-b border-[hsl(var(--border))] bg-white/50 backdrop-blur-md sticky top-0 z-30">
          <div className="flex-1"></div>
          <div className="flex items-center gap-4">
            <NotificationBell inboxHref="/placement-head/notifications" />
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
