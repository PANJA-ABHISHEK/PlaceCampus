"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "../hooks/use-notifications";

export function NotificationInbox() {
  const notifications = useNotifications({ limit: 20 });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  if (notifications.isLoading) return <LoadingState text="Loading notifications..." />;
  if (notifications.isError) return <ErrorState description="Notifications could not be loaded." onRetry={() => notifications.refetch()} />;
  const items = notifications.data?.items || [];
  return <div className="mx-auto max-w-3xl space-y-6"><div className="flex items-center justify-between"><div><p className="text-sm text-[hsl(var(--muted-foreground))]">Updates from your PlaceCampus activity</p><h1 className="text-3xl font-bold text-heading">Notifications</h1></div><button type="button" onClick={() => markAll.mutate()} disabled={markAll.isPending || !items.some((item) => !item.readAt)} className="rounded-md border px-3 py-2 text-sm disabled:opacity-50">Mark all as read</button></div><Card><CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Your updates</CardTitle></CardHeader><CardContent className="p-0">{items.length ? items.map((item) => <div key={item.id} className={`flex items-start justify-between gap-4 border-t p-4 ${item.readAt ? "" : "bg-[hsl(var(--primary)/0.06)]"}`}><div><p className="font-semibold">{item.title}</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{item.message}</p><p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">{new Date(item.createdAt).toLocaleString()}</p></div><div className="flex shrink-0 gap-2">{!item.readAt && <button type="button" className="text-xs text-[hsl(var(--primary))]" onClick={() => markRead.mutate(item.id)}>Mark read</button>}<Link className="text-xs text-[hsl(var(--primary))]" href={item.actionUrl}>Open</Link></div></div>) : <EmptyState title="You are all caught up" description="Successful activity updates will appear here." />}</CardContent></Card></div>;
}
