"use client";

import Link from "next/link";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "../hooks/use-notifications";

export function NotificationInbox({ variant = "default" }: { variant?: "default" | "faculty" }) {
  const notifications = useNotifications({ limit: 20 });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const faculty = variant === "faculty";

  if (notifications.isLoading) return <LoadingState text="Loading notifications..." />;
  if (notifications.isError) return <ErrorState description="Notifications could not be loaded." onRetry={() => notifications.refetch()} />;

  const items = notifications.data?.items || [];
  const hasUnread = items.some((item) => !item.readAt);

  return (
    <div className={cn("mx-auto space-y-6", faculty ? "max-w-4xl" : "max-w-3xl")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className={cn("text-sm", faculty ? "font-medium text-[#E25A00]" : "text-[hsl(var(--muted-foreground))]")}>Updates from your PlaceCampus activity</p>
          <h1 className={cn("mt-1 font-bold", faculty ? "text-3xl tracking-tight text-[#10264A]" : "text-3xl text-heading")}>Notifications</h1>
        </div>
        <button
          type="button"
          onClick={() => markAll.mutate()}
          disabled={markAll.isPending || !hasUnread}
          className={cn(
            faculty
              ? "inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#FFD7C2] bg-white px-4 text-sm font-semibold text-[#D9500A] shadow-sm transition hover:bg-[#FFF5EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B1A]/30 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              : "rounded-md border px-3 py-2 text-sm disabled:opacity-50",
          )}
        >
          {faculty && <CheckCheck className="h-4 w-4" aria-hidden="true" />}
          Mark all as read
        </button>
      </div>

      <Card className={cn(faculty && "overflow-hidden rounded-2xl border-[#E3E8EF] shadow-sm hover:shadow-sm")}>
        <CardHeader className={cn(faculty && "border-b border-[#E9EDF2] px-5 py-4 sm:px-6")}>
          <CardTitle className={cn("flex items-center gap-2", faculty && "text-base text-[#10264A]")}>
            <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", faculty ? "bg-[#FFF1E8] text-[#F45D16]" : "")}>
              <Bell className="h-5 w-5" aria-hidden="true" />
            </span>
            Your updates
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length ? items.map((item) => (
            <div
              key={item.id}
              className={cn(
                faculty ? "flex flex-col items-start justify-between gap-3 border-t p-4 sm:flex-row sm:gap-4" : "flex items-start justify-between gap-4 border-t p-4",
                faculty && "border-[#E9EDF2] px-5 py-4 transition-colors sm:px-6",
                item.readAt
                  ? faculty ? "bg-white hover:bg-[#FAFBFC]" : ""
                  : faculty ? "border-l-[3px] border-l-[#FF6B1A] bg-[#FFF8F3]" : "bg-[hsl(var(--primary)/0.06)]",
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={cn("font-semibold", faculty && "text-[#10264A]")}>{item.title}</p>
                  {faculty && !item.readAt && <span className="rounded-full bg-[#FFE4D4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#C64B0B]">New</span>}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{item.message}</p>
                <p className="mt-2 text-xs text-[#7B8797]">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
              <div className={cn("flex shrink-0 gap-2", faculty && "self-end gap-2 sm:self-auto sm:items-center")}>
                {!item.readAt && (
                  <button
                    type="button"
                    className={cn("text-xs text-[hsl(var(--primary))]", faculty && "rounded-lg px-2.5 py-1.5 font-semibold text-[#D9500A] hover:bg-[#FFEBDD]")}
                    onClick={() => markRead.mutate(item.id)}
                  >
                    Mark read
                  </button>
                )}
                <Link
                  className={cn("text-xs text-[hsl(var(--primary))]", faculty && "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold text-[#10264A] hover:bg-slate-100")}
                  href={item.actionUrl}
                >
                  Open{faculty && <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />}
                </Link>
              </div>
            </div>
          )) : <EmptyState title="You are all caught up" description="Successful activity updates will appear here." />}
        </CardContent>
      </Card>
    </div>
  );
}
