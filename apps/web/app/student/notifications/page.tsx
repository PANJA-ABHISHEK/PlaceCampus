"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format, formatDistance } from "date-fns";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Bell,
  BellRing,
  Check,
  CheckCheck,
  CircleAlert,
  Inbox,
  Loader2,
  MailOpen,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import type { NotificationItem } from "@placecampus/shared-types";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationFeed,
  useUnreadNotificationCount,
} from "@/features/notifications/hooks/use-notifications";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  getCategory,
  type NotificationCategory,
} from "@/features/notifications/lib/notification-meta";
import { StatCard } from "@/features/preparation/components/prep-ui";
import { useNow } from "@/features/interviews/hooks/use-now";
import { HeroWaves, lightHeroClassName } from "@/components/brand/hero-waves";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Tab = "ALL" | "UNREAD" | "READ";

const errorText = (error: unknown) => (error instanceof ApiError ? error.message : "Please try again.");

export default function StudentNotificationsPage() {
  const router = useRouter();
  const now = useNow(60_000);
  const feed = useNotificationFeed();
  const unreadQuery = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const [tab, setTab] = React.useState<Tab>("ALL");
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<NotificationCategory | "ALL">("ALL");
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const items = React.useMemo(() => feed.data?.pages.flatMap((page) => page.items) ?? [], [feed.data]);
  const total = feed.data?.pages[0]?.total ?? 0;
  const unread = unreadQuery.data?.count ?? items.filter((item) => !item.readAt).length;
  const read = Math.max(total - unread, 0);

  const presentCategories = React.useMemo(() => {
    const seen = new Set(items.map((item) => getCategory(item.type)));
    return CATEGORY_ORDER.filter((key) => seen.has(key));
  }, [items]);

  const query = search.trim().toLowerCase();
  const visible = items.filter((item) => {
    if (tab === "UNREAD" && item.readAt) return false;
    if (tab === "READ" && !item.readAt) return false;
    if (category !== "ALL" && getCategory(item.type) !== category) return false;
    if (query && !`${item.title} ${item.message}`.toLowerCase().includes(query)) return false;
    return true;
  });
  const filtered = Boolean(query) || category !== "ALL";

  const markOne = (item: NotificationItem, quiet = false) => {
    if (item.readAt) return;
    setPendingId(item.id);
    markRead.mutate(item.id, {
      onSuccess: () => { if (!quiet) toast.success("Marked as read"); },
      onError: (error) => toast.error("Couldn't update the notification", { description: errorText(error) }),
      onSettled: () => setPendingId(null),
    });
  };

  const open = (item: NotificationItem) => {
    markOne(item, true);
    if (item.actionUrl?.startsWith("/")) router.push(item.actionUrl);
  };

  const markEverything = () =>
    markAll.mutate(undefined, {
      onSuccess: ({ updated }) =>
        toast.success("All caught up", { description: `${updated} notification${updated === 1 ? "" : "s"} marked as read.` }),
      onError: (error) => toast.error("Couldn't mark notifications as read", { description: errorText(error) }),
    });

  const clearFilters = () => {
    setSearch("");
    setCategory("ALL");
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "ALL", label: "All", count: total },
    { key: "UNREAD", label: "Unread", count: unread },
    { key: "READ", label: "Read", count: read },
  ];

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <section className={lightHeroClassName}>
        <HeroWaves />
        <div className="relative flex items-center justify-between gap-6">
          <div className="max-w-[40rem] space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              <span className="text-[hsl(var(--foreground))]">My </span>
              <span className="text-[hsl(var(--primary))]">Notifications</span>
            </h1>
            <p className="text-[15px] leading-relaxed text-[hsl(var(--foreground)/0.8)] sm:text-base">
              Stay updated with your placement journey and important activities.
            </p>
            <div className="pt-1 text-sm">
              {feed.isLoading ? (
                <Skeleton className="h-7 w-44 rounded-full" />
              ) : unread > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--primary)/0.1)] px-3 py-1 font-semibold text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary)/0.25)]">
                  <BellRing className="h-4 w-4" aria-hidden="true" />
                  {unread} unread notification{unread === 1 ? "" : "s"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  <CheckCheck className="h-4 w-4" aria-hidden="true" />
                  You&apos;re all caught up
                </span>
              )}
            </div>
          </div>
          <div className="pointer-events-none hidden h-[130px] w-[170px] shrink-0 lg:block xl:mr-16">
            <BellIllustration count={unread} />
          </div>
        </div>
      </section>

      {feed.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[88px] rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total Notifications" value={String(total)} icon={Bell} tile="bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]" delay={0} />
          <StatCard label="Unread" value={String(unread)} icon={BellRing} tile="bg-amber-50 text-amber-600" delay={60} />
          <StatCard label="Read" value={String(read)} icon={MailOpen} tile="bg-emerald-50 text-emerald-600" delay={120} />
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-[hsl(var(--border)/0.8)] bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label="Filter by status" className="inline-flex w-full rounded-xl bg-[hsl(var(--muted))] p-1 sm:w-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none",
                  tab === t.key ? "bg-white text-[hsl(var(--foreground))] shadow-sm" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                )}
              >
                {t.label}
                <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] tabular-nums", tab === t.key ? "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]" : "bg-white/70")}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block min-w-0 sm:w-64">
              <span className="sr-only">Search notifications</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notifications"
                className="h-10 w-full rounded-xl border border-[hsl(var(--border))] bg-white pl-9 pr-3 text-sm outline-none focus:border-[hsl(var(--primary)/0.5)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.15)]"
              />
            </label>
            <label className="block">
              <span className="sr-only">Filter by category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as NotificationCategory | "ALL")}
                className="h-10 w-full rounded-xl border border-[hsl(var(--border))] bg-white px-3 text-sm font-medium outline-none focus:border-[hsl(var(--primary)/0.5)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.15)] sm:w-48"
              >
                <option value="ALL">All categories</option>
                {presentCategories.map((key) => <option key={key} value={key}>{CATEGORY_META[key].label}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={markEverything}
              disabled={!unread || markAll.isPending}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-white hover:bg-[hsl(var(--color-primary-600))] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {markAll.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCheck className="h-4 w-4" aria-hidden="true" />}
              Mark all as read
            </button>
          </div>
        </div>

        {feed.isLoading ? (
          <div className="space-y-3" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)}
          </div>
        ) : feed.isError ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center">
            <CircleAlert className="h-8 w-8 text-red-600" aria-hidden="true" />
            <p className="font-semibold text-red-900">Couldn&apos;t load your notifications</p>
            <button type="button" onClick={() => feed.refetch()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200">
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Retry
            </button>
          </div>
        ) : visible.length === 0 ? (
          filtered ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[hsl(var(--border))] px-6 py-12 text-center">
              <Search className="h-8 w-8 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
              <p className="font-semibold text-[hsl(var(--foreground))]">No notifications match your filters</p>
              <button type="button" onClick={clearFilters} className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--primary))] hover:underline">
                <X className="h-4 w-4" aria-hidden="true" /> Clear filters
              </button>
            </div>
          ) : tab === "READ" ? (
            <EmptyState icon={Inbox} title="No read notifications yet" text="Notifications you've opened or marked as read will appear here." />
          ) : (
            <EmptyState icon={CheckCheck} title="You're All Caught Up!" text="New updates about your placement journey will appear here." />
          )
        ) : (
          <ul className="space-y-3">
            {visible.map((item, index) => (
              <li key={item.id} style={{ "--pc-delay": `${Math.min(index, 8) * 40}ms` } as React.CSSProperties} className="pc-enter">
                <NotificationCard
                  item={item}
                  now={now}
                  busy={pendingId === item.id}
                  onOpen={() => open(item)}
                  onMarkRead={() => markOne(item)}
                />
              </li>
            ))}
          </ul>
        )}

        {feed.hasNextPage && !feed.isLoading && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => feed.fetchNextPage()}
              disabled={feed.isFetchingNextPage}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white px-5 text-sm font-semibold hover:border-[hsl(var(--primary)/0.4)] hover:text-[hsl(var(--primary))] disabled:opacity-60"
            >
              {feed.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Load older notifications
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function NotificationCard({
  item,
  now,
  busy,
  onOpen,
  onMarkRead,
}: {
  item: NotificationItem;
  now: number;
  busy: boolean;
  onOpen: () => void;
  onMarkRead: () => void;
}) {
  const meta = CATEGORY_META[getCategory(item.type)];
  const Icon = meta.icon;
  const isUnread = !item.readAt;
  const hasDestination = Boolean(item.actionUrl?.startsWith("/"));
  const created = new Date(item.createdAt);

  return (
    <article
      className={cn(
        "group relative flex gap-4 rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] sm:p-5",
        isUnread ? "border-[hsl(var(--primary)/0.2)] bg-[hsl(var(--primary)/0.05)]" : "border-[hsl(var(--border)/0.8)] bg-white",
      )}
    >
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", meta.tile)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", meta.chip)}>{meta.label}</span>
          {isUnread && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[hsl(var(--primary))]">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" aria-hidden="true" /> Unread
            </span>
          )}
          <time dateTime={item.createdAt} title={format(created, "d MMM yyyy, h:mm a")} className="ml-auto text-xs text-[hsl(var(--muted-foreground))]">
            {formatDistance(created, now, { addSuffix: true })}
          </time>
        </div>
        <h3 className={cn("text-[15px] text-[hsl(var(--foreground))]", isUnread ? "font-bold" : "font-semibold")}>
          {/* Stretched button: the whole card opens the notification. */}
          <button type="button" onClick={onOpen} className="text-left after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[hsl(var(--primary)/0.5)]">
            {item.title}
          </button>
        </h3>
        <p className="text-sm leading-relaxed text-[hsl(var(--foreground)/0.75)]">{item.message}</p>

        {(isUnread || hasDestination) && (
          <div className="relative z-10 flex flex-wrap gap-2 pt-1.5">
            {isUnread && (
              <button
                type="button"
                onClick={onMarkRead}
                disabled={busy}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-white px-3 text-xs font-semibold text-[hsl(var(--foreground)/0.8)] hover:border-[hsl(var(--primary)/0.4)] hover:text-[hsl(var(--primary))] disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                Mark as read
              </button>
            )}
            {hasDestination && (
              <button
                type="button"
                onClick={onOpen}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[hsl(var(--primary)/0.1)] px-3 text-xs font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.16)]"
              >
                Open <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof Bell; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.03)] px-6 py-12 text-center">
      <span className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <p className="text-lg font-bold text-[hsl(var(--foreground))]">{title}</p>
      <p className="max-w-[28rem] text-sm text-[hsl(var(--muted-foreground))]">{text}</p>
    </div>
  );
}

function BellIllustration({ count }: { count: number }) {
  return (
    <svg viewBox="0 0 170 130" className="h-full w-full" aria-hidden="true">
      <ellipse cx="85" cy="118" rx="52" ry="7" fill="hsl(var(--primary) / 0.12)" />
      <path d="M38 40 q-10 14 0 28" fill="none" stroke="hsl(var(--primary) / 0.35)" strokeWidth="3" strokeLinecap="round" />
      <path d="M26 32 q-16 22 0 44" fill="none" stroke="hsl(var(--primary) / 0.2)" strokeWidth="3" strokeLinecap="round" />
      <path d="M132 40 q10 14 0 28" fill="none" stroke="hsl(var(--primary) / 0.35)" strokeWidth="3" strokeLinecap="round" />
      <path d="M144 32 q16 22 0 44" fill="none" stroke="hsl(var(--primary) / 0.2)" strokeWidth="3" strokeLinecap="round" />
      <g className="pc-bell-swing">
        <rect x="80" y="8" width="10" height="10" rx="5" fill="hsl(var(--foreground))" />
        <path d="M85 16 c-22 0 -34 16 -34 38 v22 l-9 13 h86 l-9 -13 v-22 c0 -22 -12 -38 -34 -38z" fill="hsl(var(--foreground))" />
        <path d="M62 40 c3 -8 9 -13 17 -15" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" />
        <rect x="42" y="86" width="86" height="7" rx="3.5" fill="hsl(var(--foreground) / 0.85)" />
        <circle cx="85" cy="101" r="8" fill="hsl(var(--primary))" />
      </g>
      {count > 0 && (
        <g>
          <circle cx="118" cy="30" r="16" fill="hsl(var(--primary))" stroke="white" strokeWidth="3" />
          <text x="118" y="35.5" textAnchor="middle" fontSize={count > 99 ? 11 : 15} fontWeight="800" fill="white">
            {count > 99 ? "99+" : count}
          </text>
        </g>
      )}
    </svg>
  );
}
