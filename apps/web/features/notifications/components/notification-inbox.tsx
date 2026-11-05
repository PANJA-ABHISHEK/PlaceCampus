"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "../hooks/use-notifications";
import { AdminPageHeader, AdminPanelHeader } from "@/features/admin/components/admin-ui";
import { adminCard } from "@/features/admin-imports/components/import-ui";

export function NotificationInbox() {
  const notifications = useNotifications({ limit: 20 });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  if (notifications.isLoading) return <div className="mx-auto w-full max-w-[980px]"><LoadingState text="Loading notifications..." /></div>;
  if (notifications.isError) return <div className="mx-auto w-full max-w-[980px]"><ErrorState description="Notifications could not be loaded." onRetry={() => notifications.refetch()} /></div>;
  const items = notifications.data?.items || [];
  return <div className="mx-auto w-full max-w-[980px] space-y-6"><AdminPageHeader title="Notifications" description="Updates from your PlaceCampus activity." action={<button type="button" onClick={() => markAll.mutate()} disabled={markAll.isPending || !items.some((item) => !item.readAt)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#0B1F44] hover:border-[#FF6B1A]/50 disabled:opacity-50"><CheckCheck className="h-4 w-4" aria-hidden="true" /> Mark all as read</button>} /><Card className={`${adminCard} overflow-hidden`}><AdminPanelHeader icon={Bell} title="Your updates" /><CardContent className="p-0">{items.length ? items.map((item) => <div key={item.id} className={`flex items-start justify-between gap-4 border-t border-[#E5E7EB] p-5 transition-colors first:border-t-0 ${item.readAt ? "bg-white" : "bg-orange-50/60"}`}><div className="min-w-0"><p className="font-semibold text-[#0B1F44]">{item.title}</p><p className="mt-1 text-sm leading-6 text-[#64748B]">{item.message}</p><p className="mt-2 text-xs text-[#64748B]">{new Date(item.createdAt).toLocaleString()}</p></div><div className="flex shrink-0 gap-3">{!item.readAt && <button type="button" className="text-sm font-semibold text-[#FF6B1A] hover:underline" onClick={() => markRead.mutate(item.id)}>Mark read</button>}<Link className="text-sm font-semibold text-[#0B1F44] hover:text-[#FF6B1A]" href={item.actionUrl}>Open</Link></div></div>) : <EmptyState title="You are all caught up" description="Successful activity updates will appear here." />}</CardContent></Card></div>;
}
