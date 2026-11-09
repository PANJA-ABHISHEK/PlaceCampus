"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  CalendarDays,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheckBig,
  Clock3,
  FileClock,
  Filter,
  GraduationCap,
  Lock,
  RotateCcw,
  Search,
  SearchX,
  TimerReset,
  UserRound,
  X,
} from "lucide-react";
import { EvidenceStatus, EvidenceType, type FacultyReviewQueueItem } from "@placecampus/shared-types";
import { useFacultyReviews } from "@/features/faculty/hooks/use-faculty-reviews";
import { useFacultyDashboard } from "@/features/faculty/hooks/use-faculty-portal";
import { StudentAvatar } from "@/features/faculty/components/faculty-ui";
import { TYPE_META } from "@/features/evidence/lib/evidence-meta";
import { HeroWaves } from "@/components/brand/hero-waves";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Tab = "NEEDS_REVIEW" | "OVERDUE" | "RESUBMISSION_REQUESTED";
type StateFilter = "ALL" | "CLAIMED" | "ASSIGNED" | "OVERDUE";

const card = "rounded-[18px] border border-[#E7EBF0] bg-white shadow-[0_6px_24px_-14px_rgba(16,38,74,0.14)]";

/** One badge style per review state (Master Plan status colours). */
const BADGE = {
  CLAIMED: { label: "Claimed", icon: Lock, className: "bg-amber-50 text-amber-800 ring-amber-200" },
  ASSIGNED: { label: "Assigned", icon: UserRound, className: "bg-blue-50 text-blue-700 ring-blue-200" },
  OVERDUE: { label: "Overdue", icon: Clock3, className: "bg-rose-50 text-rose-700 ring-rose-200" },
  RESUBMISSION: { label: "Awaiting student", icon: TimerReset, className: "bg-violet-50 text-violet-700 ring-violet-200" },
} as const;

const selectClassName =
  "h-11 w-full appearance-none rounded-xl border border-[#DCE2EA] bg-white pl-10 pr-9 text-sm font-semibold text-[#10264A] outline-none transition focus:border-[#FF9A5C] focus:ring-4 focus:ring-[#FF6500]/10";

function FacultyReviewsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const tab: Tab =
    params.get("filter") === "overdue"
      ? "OVERDUE"
      : params.get("status") === EvidenceStatus.RESUBMISSION_REQUESTED
        ? "RESUBMISSION_REQUESTED"
        : "NEEDS_REVIEW";
  const dashboard = useFacultyDashboard();
  const stats = dashboard.data?.stats;
  const [category, setCategory] = React.useState<EvidenceType | "">("");
  const [stateFilter, setStateFilter] = React.useState<StateFilter>("ALL");
  const [query, setQuery] = React.useState("");

  const { data: reviews, isLoading, isError, refetch } = useFacultyReviews(
    tab === "OVERDUE" ? undefined : tab,
    category || undefined,
    tab === "OVERDUE" ? "overdue" : undefined,
  );

  const setTab = (next: Tab) => {
    const q = next === "OVERDUE" ? "?filter=overdue" : next === "RESUBMISSION_REQUESTED" ? `?status=${next}` : "";
    setStateFilter("ALL");
    router.replace(`/faculty/reviews${q}`, { scroll: false });
  };

  const all = (reviews ?? []) as unknown as FacultyReviewQueueItem[];
  const needle = query.trim().toLowerCase();
  const items = all.filter((item) => {
    if (stateFilter === "OVERDUE" && !item.overdue) return false;
    if ((stateFilter === "CLAIMED" || stateFilter === "ASSIGNED") && item.reviewState !== stateFilter) return false;
    if (!needle) return true;
    return [item.student?.fullName, item.student?.registrationNumber, item.title, TYPE_META[item.type]?.label]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle));
  });
  const filtering = Boolean(needle || category || stateFilter !== "ALL");

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "NEEDS_REVIEW", label: "Needs Review", count: stats?.pendingReviews },
    { key: "OVERDUE", label: "Overdue", count: stats?.overdueReviews },
    { key: "RESUBMISSION_REQUESTED", label: "Awaiting Resubmission", count: stats?.awaitingResubmission },
  ];

  return (
    <div className="mx-auto -mt-1 w-full max-w-[1320px] space-y-5 pb-10 sm:-mt-2">
      {/* Hero */}
      <header className="pc-enter relative overflow-hidden rounded-[20px] border border-[#FF6500]/15 bg-gradient-to-r from-white via-[#FFF6F0] to-[#FFE9DB] px-5 py-6 shadow-[0_10px_30px_-20px_rgba(255,101,0,0.45)] sm:px-8">
        <HeroWaves />
        <div className="relative flex items-center justify-between gap-6">
          <div className="min-w-0 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#FFE7D6] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#C24E00]">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />Faculty Workspace
            </span>
            <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight text-[#10264A] sm:text-4xl">
              Evidence Review <span className="text-[#FF6500]">Queue</span>
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#10264A]/75 sm:text-[15px]">
              Review and verify student-submitted evidence such as certifications, projects, internships and more.
            </p>
          </div>
          <div className="pointer-events-none hidden h-[132px] w-[230px] shrink-0 lg:block xl:mr-6">
            <ReviewIllustration />
          </div>
        </div>
      </header>

      {/* Stats */}
      <section aria-label="Review statistics" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          icon={FileClock}
          value={stats?.pendingReviews}
          label="Pending Reviews"
          hint="Assigned to you"
          tone="orange"
          active={tab === "NEEDS_REVIEW"}
          onClick={() => setTab("NEEDS_REVIEW")}
          loading={dashboard.isLoading}
        />
        <StatCard
          icon={RotateCcw}
          value={stats?.overdueReviews}
          label="Overdue"
          hint="Past 3 working days"
          tone="blue"
          active={tab === "OVERDUE"}
          onClick={() => setTab("OVERDUE")}
          loading={dashboard.isLoading}
        />
        <StatCard
          icon={Clock3}
          value={stats?.awaitingResubmission}
          label="Awaiting Resubmission"
          hint="Returned to students"
          tone="violet"
          active={tab === "RESUBMISSION_REQUESTED"}
          onClick={() => setTab("RESUBMISSION_REQUESTED")}
          loading={dashboard.isLoading}
        />
        <StatCard
          icon={CircleCheckBig}
          value={stats?.reviewedThisMonth}
          label="Total Reviewed"
          hint={`Decisions in ${format(new Date(), "MMMM")}`}
          tone="green"
          loading={dashboard.isLoading}
        />
      </section>

      {/* Queue */}
      <section aria-label="Evidence review queue" className={cn(card, "overflow-hidden")}>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-3 pt-2 2xl:flex-row 2xl:items-center 2xl:justify-between 2xl:pb-2 2xl:pr-4">
          <div role="tablist" aria-label="Review filter" className="-mb-px flex gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "relative inline-flex h-12 shrink-0 items-center gap-1.5 rounded-t-xl px-4 text-sm font-semibold transition-colors",
                    active ? "bg-[#FFF6F0] text-[#FF6500]" : "text-[#10264A]/70 hover:text-[#10264A]",
                  )}
                >
                  {t.label}
                  <span className="tabular-nums">({t.count ?? "–"})</span>
                  <span aria-hidden="true" className={cn("absolute inset-x-3 bottom-0 h-[3px] rounded-t-full", active ? "bg-[#FF6500]" : "bg-transparent")} />
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-2 px-1 pb-3 sm:grid-cols-[minmax(0,1fr)_200px_180px] 2xl:w-[680px] 2xl:px-0 2xl:pb-0">
            <label className="relative">
              <span className="sr-only">Search the queue</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by student, evidence or category…"
                className="h-11 w-full rounded-xl border border-[#DCE2EA] bg-white pl-10 pr-3 text-sm text-[#10264A] outline-none transition placeholder:text-slate-400 focus:border-[#FF9A5C] focus:ring-4 focus:ring-[#FF6500]/10"
              />
            </label>
            <label className="relative">
              <span className="sr-only">Filter by category</span>
              <Filter className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#10264A]" aria-hidden="true" />
              <select value={category} onChange={(e) => setCategory(e.target.value as EvidenceType | "")} className={selectClassName}>
                <option value="">All Categories</option>
                {(Object.keys(TYPE_META) as EvidenceType[]).map((t) => (
                  <option key={t} value={t}>{TYPE_META[t].plural}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            </label>
            <label className="relative">
              <span className="sr-only">Filter by review status</span>
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#10264A]" aria-hidden="true" />
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value as StateFilter)}
                disabled={tab === "RESUBMISSION_REQUESTED"}
                className={cn(selectClassName, "disabled:cursor-not-allowed disabled:opacity-50")}
              >
                <option value="ALL">All Statuses</option>
                <option value="CLAIMED">Claimed</option>
                <option value="ASSIGNED">Assigned</option>
                {tab !== "OVERDUE" && <option value="OVERDUE">Overdue only</option>}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            </label>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5" aria-busy="true">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)}</div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center" role="alert">
            <CircleAlert className="h-8 w-8 text-rose-600" aria-hidden="true" />
            <p className="font-semibold text-rose-900">Could not load the review queue</p>
            <button type="button" onClick={() => refetch()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          filtering && all.length > 0 ? (
            <EmptyState icon={SearchX} tone="slate" text="No evidence matches your search or filters.">
              <button
                type="button"
                onClick={() => { setQuery(""); setCategory(""); setStateFilter("ALL"); }}
                className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-[#10264A] hover:bg-slate-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />Clear filters
              </button>
            </EmptyState>
          ) : (
            <EmptyState
              icon={CheckCheck}
              tone="green"
              text={
                category
                  ? `No ${TYPE_META[category].plural.toLowerCase()} in this list.`
                  : tab === "OVERDUE"
                    ? "Nothing is overdue. Nice work!"
                    : tab === "RESUBMISSION_REQUESTED"
                      ? "No items are waiting on a student resubmission."
                      : "You're all caught up! No evidence reviews require your attention."
              }
            />
          )
        ) : (
          <ul className="divide-y divide-slate-100 px-2 sm:px-3">
            {items.map((item) => <QueueRow key={item.id} item={item} />)}
          </ul>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Showing {items.length}{filtering ? ` of ${all.length}` : ""} item{items.length === 1 ? "" : "s"}, most urgent first. Opening an item claims it for 30 minutes.
          </p>
        )}
      </section>
    </div>
  );
}

function QueueRow({ item }: { item: FacultyReviewQueueItem }) {
  const type = TYPE_META[item.type] ?? TYPE_META.OTHER;
  const waiting = item.status === EvidenceStatus.RESUBMISSION_REQUESTED;
  const badge = waiting ? BADGE.RESUBMISSION : item.overdue ? BADGE.OVERDUE : BADGE[item.reviewState] ?? BADGE.ASSIGNED;
  return (
    <li>
      <Link
        href={`/faculty/reviews/${item.id}`}
        className="group grid grid-cols-1 items-center gap-3 rounded-xl px-3 py-4 transition-colors hover:bg-slate-50/80 focus-visible:bg-slate-50 focus-visible:outline-none md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)_auto] md:gap-5"
      >
        <div className="flex min-w-0 items-center gap-3 md:border-r md:border-slate-100 md:pr-5">
          <StudentAvatar name={item.student?.fullName} className="h-12 w-12 text-base" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-[#10264A]">{item.student?.fullName ?? "Unknown student"}</p>
            <p className="truncate text-xs text-slate-500">{item.student?.registrationNumber ?? "No reg. number"}</p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF6F0] text-[#FF6500]">
            <type.icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-[#10264A] group-hover:text-[#FF6500]">{item.title}</p>
            <p className="truncate text-xs text-slate-500">{type.label} · Submitted {format(new Date(item.createdAt), "MMM d, yyyy")}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:flex-nowrap md:justify-end">
          {item.reviewDueAt && !waiting && (
            <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-sm", item.overdue ? "font-semibold text-rose-600" : "text-slate-600")}>
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              {item.overdue ? "Overdue" : "Due"}: {format(new Date(item.reviewDueAt), "MMM d, yyyy")}
            </span>
          )}
          <span className={cn("inline-flex min-w-[112px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ring-1", badge.className)}>
            <badge.icon className="h-3.5 w-3.5" aria-hidden="true" />
            {badge.label}
          </span>
          <ChevronRight className="ml-auto h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#FF6500] md:ml-0" aria-hidden="true" />
        </div>
      </Link>
    </li>
  );
}

const TONES = {
  orange: { card: "from-[#FFF6F0] to-white border-[#FFE0CC]", icon: "bg-[#FFE7D6] text-[#FF6500]", ring: "ring-[#FF6500]/40" },
  blue: { card: "from-blue-50/80 to-white border-blue-100", icon: "bg-blue-100/70 text-blue-600", ring: "ring-blue-400/50" },
  violet: { card: "from-violet-50/80 to-white border-violet-100", icon: "bg-violet-100/70 text-violet-600", ring: "ring-violet-400/50" },
  green: { card: "from-emerald-50/80 to-white border-emerald-100", icon: "bg-emerald-100/70 text-emerald-600", ring: "ring-emerald-400/50" },
};

function StatCard({
  icon: Icon,
  value,
  label,
  hint,
  tone,
  active,
  onClick,
  loading,
}: {
  icon: React.ElementType;
  value?: number;
  label: string;
  hint: string;
  tone: keyof typeof TONES;
  active?: boolean;
  onClick?: () => void;
  loading?: boolean;
}) {
  const t = TONES[tone];
  const body = (
    <>
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14", t.icon)}>
        <Icon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        {loading ? (
          <span className="block h-8 w-12 animate-pulse rounded bg-slate-200/70" />
        ) : (
          <span className="block text-3xl font-extrabold tabular-nums leading-none text-[#10264A]">{value ?? "–"}</span>
        )}
        <span className="mt-1.5 block text-sm font-semibold text-[#10264A]">{label}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
    </>
  );
  const className = cn(
    "flex flex-col items-start gap-3 rounded-[18px] border bg-gradient-to-br p-4 text-left shadow-[0_6px_24px_-16px_rgba(16,38,74,0.18)] sm:flex-row sm:items-center sm:gap-4 sm:p-5",
    t.card,
    active && cn("ring-2", t.ring),
  );
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn(className, "transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2", t.ring)}>
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
}

function EmptyState({ icon: Icon, text, tone, children }: { icon: React.ElementType; text: string; tone: "green" | "slate"; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className={cn("flex h-12 w-12 items-center justify-center rounded-full", tone === "green" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500")}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="text-sm text-slate-600">{text}</p>
      {children}
    </div>
  );
}

function ReviewIllustration() {
  return (
    <svg viewBox="0 0 230 132" className="h-full w-full drop-shadow-[0_16px_22px_rgba(234,88,12,0.14)]" aria-hidden="true">
      <path d="M58 96 C 50 70 58 52 72 44 C 70 62 74 78 66 98 Z" fill="#34D399" opacity="0.85" />
      <path d="M66 98 C 72 74 86 64 98 62 C 92 78 86 90 72 100 Z" fill="#10B981" opacity="0.8" />
      <rect x="30" y="98" width="72" height="11" rx="4" fill="#FB923C" />
      <rect x="24" y="108" width="80" height="11" rx="4" fill="#3B5BDB" />
      <rect x="34" y="99.5" width="60" height="2" rx="1" fill="#fff" opacity="0.6" />
      <rect x="92" y="10" width="112" height="82" rx="9" fill="#3B5BDB" />
      <rect x="99" y="17" width="98" height="68" rx="5" fill="#F8FAFC" />
      {[32, 50, 68].map((y) => (
        <g key={y}>
          <circle cx="114" cy={y} r="6" fill="#7DD3FC" />
          <path d={`M111 ${y} l2.2 2.2 4 -4.2`} stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
          <rect x="126" y={y - 3} width="44" height="6" rx="3" fill="#CBD5E1" />
        </g>
      ))}
      <path d="M84 94 h128 l-8 14 h-112 z" fill="#2E3F8F" />
      <circle cx="176" cy="54" r="22" fill="#fff" fillOpacity="0.55" stroke="#FF6500" strokeWidth="6" />
      <path d="M192 70 l20 22" stroke="#FF6500" strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}

export default function FacultyReviewsPage() {
  return (
    <React.Suspense fallback={<Skeleton className="mx-auto h-[400px] max-w-[1320px] rounded-2xl" />}>
      <FacultyReviewsContent />
    </React.Suspense>
  );
}
