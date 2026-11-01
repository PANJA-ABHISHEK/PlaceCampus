"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMarkNotificationRead, useNotifications, useUnreadNotificationCount } from "../hooks/use-notifications";

export function NotificationBell({ inboxHref }: { inboxHref: string }) {
  const router = useRouter();
  const count = useUnreadNotificationCount();
  const list = useNotifications({ limit: 5 });
  const markRead = useMarkNotificationRead();
  const items = list.data?.items || [];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={count.data?.count ? `${count.data.count} unread notifications` : "Notifications"} className="relative rounded-md p-1 text-[hsl(var(--muted-foreground))] hover:text-heading focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">
          <Bell className="h-5 w-5" />
          {!!count.data?.count && <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[hsl(var(--primary))] px-1 text-[10px] leading-4 text-white">{count.data.count > 99 ? "99+" : count.data.count}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-2"><span className="font-semibold">Notifications</span><Link className="text-xs text-[hsl(var(--primary))]" href={inboxHref}>View all</Link></div>
        {items.length ? items.map((item) => <DropdownMenuItem key={item.id} className={item.readAt ? "" : "bg-[hsl(var(--primary)/0.08)]"} onSelect={() => { if (!item.readAt) markRead.mutate(item.id); if (item.actionUrl.startsWith("/")) router.push(item.actionUrl); }}><div><p className="font-medium">{item.title}</p><p className="line-clamp-2 text-xs text-[hsl(var(--muted-foreground))]">{item.message}</p></div></DropdownMenuItem>) : <div className="px-2 py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">No new notifications</div>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
