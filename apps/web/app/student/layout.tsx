"use client";

import * as React from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { redirect, usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  UserCircle,
  FileCheck,
  TrendingUp,
  AlertCircle,
  Briefcase,
  Send,
  ClipboardList,
  Video,
  BookOpen,
  Settings,
  Menu,
  X,
  BrainCircuit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@placecampus/shared-types";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemePreferenceSync } from "@/features/settings/components/theme-preference-sync";

const navigation = [
  { name: "Overview", href: "/student/dashboard", icon: LayoutDashboard },
  { name: "Profile", href: "/student/profile", icon: UserCircle },
  { name: "Evidence", href: "/student/evidence", icon: FileCheck },
  { name: "Skills", href: "/student/skills", icon: BrainCircuit },
  { name: "Assessments", href: "/student/assessments", icon: ClipboardList },
  { name: "Interviews", href: "/student/interviews", icon: Video },
  { name: "Readiness", href: "/student/readiness", icon: TrendingUp },
  { name: "Skill Gaps", href: "/student/gaps", icon: AlertCircle },
  { name: "Placement Drives", href: "/student/drives", icon: Briefcase },
  { name: "Applications", href: "/student/applications", icon: Send },
  { name: "Preparation", href: "/student/preparation", icon: BookOpen },
  { name: "Settings", href: "/student/settings", icon: Settings },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, authenticated, loading, clearAuth } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Route Protection
  React.useEffect(() => {
    if (!loading && !authenticated) {
      redirect("/login");
    }
    if (!loading && authenticated && user?.role !== UserRole.STUDENT) {
      redirect("/"); // Redirect non-students
    }
  }, [loading, authenticated, user]);

  if (loading || !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--primary))]"></div>
      </div>
    );
  }

  // The interview room is full-screen: no portal chrome.
  if (pathname.startsWith("/student/interviews/room/")) {
    return user?.role === UserRole.STUDENT ? <>{children}</> : null;
  }

  const handleLogout = async () => {
    await clearAuth();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <ThemePreferenceSync />
      {/* Top Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 bg-white/90 px-4 shadow-[0_1px_12px_-4px_rgba(15,23,42,0.08)] backdrop-blur-md md:h-[72px] md:px-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={isMobileMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="-ml-1 flex h-10 w-10 items-center justify-center rounded-xl text-[hsl(var(--foreground)/0.8)] transition-colors hover:bg-[hsl(var(--muted))] md:hidden"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
          <Link
            href="/student/dashboard"
            aria-label="PlaceCampus student dashboard"
            className="flex shrink-0 items-center transition-opacity hover:opacity-85 dark:rounded-lg dark:bg-white dark:px-2 dark:py-1"
          >
            <Image
              src="/images/placecampus-logo-trimmed.png"
              alt="PlaceCampus"
              width={1200}
              height={269}
              priority
              className="h-auto w-[150px] sm:w-[180px] md:w-[200px]"
            />
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell inboxHref="/student/notifications" variant="link" />
          <span
            aria-hidden="true"
            className="hidden h-8 w-px bg-[hsl(var(--border))] sm:block"
          />
          <UserMenu
            name={user?.fullName || "Student"}
            roleLabel="Student"
            profileHref="/student/profile"
            settingsHref="/student/settings"
            switchRoleHref={(user?.roles?.length ?? 0) > 1 ? "/select-role" : undefined}
            onLogout={handleLogout}
          />
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav
          aria-label="Student navigation"
          className={cn(
            "fixed bottom-0 left-0 top-16 z-30 w-64 shrink-0 overflow-y-auto bg-white px-3 py-5 transition-transform duration-300 ease-in-out md:sticky md:top-[72px] md:h-[calc(100vh-72px)] md:translate-x-0 md:bg-transparent md:px-4 md:py-6",
            isMobileMenuOpen
              ? "translate-x-0 shadow-[var(--shadow-xl)]"
              : "-translate-x-full",
          )}
        >
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition-colors duration-150",
                      isActive
                        ? "bg-[hsl(var(--primary)/0.1)] font-semibold text-[hsl(var(--primary))]"
                        : "text-[hsl(var(--foreground)/0.75)] hover:bg-white hover:text-[hsl(var(--foreground))] hover:shadow-[var(--shadow-xs)] max-md:hover:bg-[hsl(var(--muted))]",
                    )}
                    onClick={() => {
                      if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                    }}
                  >
                    <item.icon
                      aria-hidden="true"
                      className={cn(
                        "h-[18px] w-[18px] shrink-0",
                        isActive
                          ? "text-[hsl(var(--primary))]"
                          : "text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]",
                      )}
                    />
                    <span className="truncate">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 top-16 z-20 bg-[hsl(var(--foreground)/0.2)] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
