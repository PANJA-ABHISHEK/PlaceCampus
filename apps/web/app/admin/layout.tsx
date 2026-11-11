"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ClipboardCheck, FileSpreadsheet, LayoutDashboard, LineChart, LogOut, Menu, Settings, ShieldAlert, Tags, UserCog, Users, X } from "lucide-react";
import { SwitchRoleLink } from "@/features/auth/components/switch-role-link";
import { useAuth } from "@/features/auth/components/auth-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { UserRole } from "@placecampus/shared-types";
import { NotificationBell } from "@/features/notifications/components/notification-bell";

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Institutional Analytics", href: "/admin/analytics", icon: LineChart },
  { name: "Bulk Imports", href: "/admin/imports", icon: FileSpreadsheet },
  { name: "Faculty Assignments", href: "/admin/assignments", icon: UserCog },
  { name: "Review Queue", href: "/admin/reviews", icon: ClipboardCheck },
  { name: "User Management", href: "/admin/users", icon: Users },
  { name: "Skills Taxonomy", href: "/admin/taxonomy", icon: Tags },
  { name: "System Configuration", href: "/admin/settings", icon: Settings },
  { name: "Audit Logs", href: "/admin/logs", icon: ShieldAlert },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, authenticated, loading, clearAuth } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !authenticated) router.replace("/login");
    else if (!loading && user?.role !== UserRole.ADMIN) router.replace("/");
  }, [loading, authenticated, user?.role, router]);

  if (loading || !authenticated || user?.role !== UserRole.ADMIN) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FF6B1A] border-t-transparent" /></div>;
  }

  const initials = (user?.fullName || "System Admin").split(/\s+/).map((part) => part[0]).join("").toUpperCase().slice(0, 2);
  const currentPage = [...navigation, { name: "Notifications", href: "/admin/notifications" }].reverse().find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.name ?? "Administration";
  const handleLogout = () => { clearAuth(); router.replace("/login"); };

  return (
    <div className="min-h-screen bg-[#F7F8FA] md:flex">
      <div className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-[#E5EAF0] bg-white px-4 md:hidden">
        <Link href="/admin/dashboard" aria-label="PlaceCampus administration dashboard"><Image src="/images/placecampus-logo-trimmed.png" alt="PlaceCampus" width={206} height={64} priority className="h-9 w-auto object-contain" /></Link>
        <div className="flex items-center gap-2"><NotificationBell inboxHref="/admin/notifications" /><button type="button" aria-label={isMobileMenuOpen ? "Close navigation" : "Open navigation"} aria-expanded={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen((open) => !open)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#53647A] transition hover:bg-[#F3F5F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B1A]/40">{isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button></div>
      </div>

      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-[#E5EAF0] bg-white shadow-[0_10px_30px_-28px_rgba(20,43,77,0.25)] transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 md:shadow-none", isMobileMenuOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-[76px] items-center border-b border-[#EDF0F4] px-6"><Link href="/admin/dashboard" aria-label="PlaceCampus administration dashboard"><Image src="/images/placecampus-logo-trimmed.png" alt="PlaceCampus" width={224} height={70} priority className="h-10 w-auto object-contain object-left" /></Link></div>

        <nav aria-label="Administration" className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.17em] text-[#9AA5B3]">Workspace</p>
          <div className="space-y-1">
            {navigation.map((item, index) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const separated = index === 6;
              return <React.Fragment key={item.name}>{separated && <div className="my-3 border-t border-[#EDF0F4]" />}
                <Link href={item.href} title={item.name} onClick={() => setIsMobileMenuOpen(false)} className={cn("group relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B1A]/35", isActive ? "bg-[#FFF0E8] text-[#F45D16]" : "text-[#526176] hover:bg-[#F7F8FA] hover:text-[#142B4D]")}>
                  <item.icon className={cn("h-[17px] w-[17px] shrink-0 transition-transform group-hover:scale-105", isActive ? "text-[#F45D16]" : "text-[#758397]")} />
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  {isActive && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-[#FF6B1A]" />}
                </Link>
              </React.Fragment>;
            })}
          </div>
        </nav>

        <div className="space-y-2 border-t border-[#EDF0F4] p-3">
          <SwitchRoleLink />
          <button type="button" onClick={handleLogout} className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-semibold text-[#B54735] transition hover:bg-[#FFF3F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"><LogOut className="h-[17px] w-[17px]" />Logout</button>
        </div>
      </aside>

      {isMobileMenuOpen && <button type="button" aria-label="Close navigation menu" className="fixed inset-0 z-30 bg-[#142B4D]/20 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

      <main className="flex min-h-[calc(100vh-68px)] min-w-0 flex-1 flex-col md:min-h-screen">
        <header className="sticky top-0 z-20 hidden h-[76px] items-center justify-between border-b border-[#E5EAF0] bg-white/95 px-7 backdrop-blur md:flex xl:px-9">
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A0AAB7]">Admin <span className="px-1 text-[#CBD3DC]">/</span> <span className="text-[#718096]">{currentPage}</span></p><h2 className="mt-0.5 text-sm font-bold text-[#142B4D]">{currentPage}</h2></div>
          <div className="flex items-center gap-3">
            <NotificationBell inboxHref="/admin/notifications" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild><button type="button" aria-label="Admin profile menu" className="flex items-center gap-2 rounded-xl p-1.5 pr-2 transition hover:bg-[#F7F8FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B1A]/40"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF0E8] text-xs font-extrabold text-[#F45D16]">{initials}</span><span className="hidden text-left lg:block"><span className="block max-w-32 truncate text-xs font-bold text-[#142B4D]">{user?.fullName || "Demo Admin"}</span><span className="block text-[10px] text-[#8793A3]">System Admin</span></span><ChevronDown className="hidden h-3.5 w-3.5 text-[#8793A3] lg:block" /></button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl border border-[#E5EAF0] bg-white p-1.5 shadow-lg">
                <div className="px-2.5 py-2"><p className="truncate text-sm font-semibold text-[#142B4D]">{user?.fullName || "Demo Admin"}</p><p className="truncate text-xs text-[#718096]">{user?.email}</p></div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout} className="cursor-pointer rounded-lg text-[#B54735]"><LogOut className="mr-2 h-4 w-4" />Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="flex-1 px-4 py-5 sm:px-6 md:px-7 md:py-6 xl:px-9">{children}</div>
      </main>
    </div>
  );
}
