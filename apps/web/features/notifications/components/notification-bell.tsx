"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useMarkNotificationRead, useNotifications, useUnreadNotificationCount } from "../hooks/use-notifications";

const triggerClassName =
  "relative flex h-10 w-10 items-center justify-center rounded-xl text-[hsl(var(--foreground)/0.8)] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)]";

function UnreadBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[hsl(var(--primary))] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/**
 * `link` (students) goes straight to the full notifications page;
 * `menu` (other portals) keeps the quick dropdown.
 */
export function NotificationBell({ inboxHref, variant = "menu" }: { inboxHref: string; variant?: "menu" | "link" }) {
  const unread = useUnreadNotificationCount().data?.count ?? 0;
  const label = unread ? `${unread} unread notifications` : "Notifications";
  if (variant === "link") return <BellLink href={inboxHref} unread={unread} label={label} />;
  return <BellMenu inboxHref={inboxHref} unread={unread} label={label} />;
}

function BellLink({ href, unread, label }: { href: string; unread: number; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        triggerClassName,
        active && "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]",
        !active && unread > 0 && "bg-[hsl(var(--primary)/0.06)] text-[hsl(var(--primary))]",
      )}
    >
      <Bell className="h-5 w-5" />
      <UnreadBadge count={unread} />
    </Link>
  );
}

function BellMenu({ inboxHref, unread, label }: { inboxHref: string; unread: number; label: string }) {
  const router = useRouter();
  const list = useNotifications({ limit: 5 });
  const markRead = useMarkNotificationRead();
  const items = list.data?.items || [];
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={label} className={cn(triggerClassName, "data-[state=open]:bg-[hsl(var(--muted))]")}>
          <Bell className="h-5 w-5" />
          {!!unread && <span aria-hidden="true" className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary))] ring-2 ring-white" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="pc-menu-animate w-80 rounded-xl bg-white p-1.5 shadow-[var(--shadow-xl)]">
        <div className="flex items-center justify-between px-2.5 py-2">
          <span className="text-sm font-semibold text-[hsl(var(--foreground))]">Notifications{!!unread && <span className="ml-2 rounded-full bg-[hsl(var(--primary)/0.12)] px-2 py-0.5 text-xs font-semibold text-[hsl(var(--primary))]">{unread > 99 ? "99+" : unread} new</span>}</span>
          <Link className="text-xs font-medium text-[hsl(var(--primary))] hover:underline" href={inboxHref}>View all</Link>
        </div>
        {items.length ? items.map((item) => <DropdownMenuItem key={item.id} className={`cursor-pointer rounded-lg px-2.5 py-2 ${item.readAt ? "" : "bg-[hsl(var(--primary)/0.08)]"}`} onSelect={() => { if (!item.readAt) markRead.mutate(item.id); if (item.actionUrl.startsWith("/")) router.push(item.actionUrl); }}><div><p className="font-medium">{item.title}</p><p className="line-clamp-2 text-xs text-[hsl(var(--muted-foreground))]">{item.message}</p></div></DropdownMenuItem>) : <div className="px-2 py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">No new notifications</div>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
