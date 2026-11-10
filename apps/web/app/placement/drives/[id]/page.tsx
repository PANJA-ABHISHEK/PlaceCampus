"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeIndianRupee,
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CircleCheck,
  Code2,
  Copy,
  FileText,
  GraduationCap,
  Hash,
  Info,
  Laptop,
  Layers,
  Link2,
  Loader2,
  Lock,
  MapPin,
  MoreVertical,
  Pencil,
  Rocket,
  SearchX,
  Send,
  ShieldCheck,
  Star,
  UsersRound,
  XCircle,
} from "lucide-react";
import {
  DriveStatus,
  type CreatePlacementDriveDto,
  type PlacementDrive,
} from "@placecampus/shared-types";
import {
  useCloseDrive,
  useCreateDrive,
  usePlacementDrive,
  usePublishDrive,
} from "@/features/drives/hooks/use-drives";
import { RecruiterAccessManager } from "@/features/recruiter-access/components/recruiter-access-manager";
import { RecruiterAccessLogCard, SkillSupplyCard } from "@/features/drives/components/drive-insights";
import { CompanyMark } from "@/features/drives/components/drive-ui";
import {
  DriveCardTitle,
  DriveStatusBadge,
  STATUS_META,
  driveCardClassName,
} from "@/features/drives/components/drive-admin-ui";
import { getWindowState } from "@/features/drives/lib/drive-meta";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview", icon: Info },
  { id: "eligibility", label: "Eligibility", icon: ShieldCheck },
  { id: "skills", label: "Skills", icon: Code2 },
  { id: "cohort", label: "Skill Supply", icon: BarChart3 },
  { id: "access", label: "Recruiter Access", icon: UsersRound },
] as const;

type TabId = (typeof TABS)[number]["id"];

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null;

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError && error.message ? error.message : fallback;

/** A copy of the drive's content as a new draft; dates are left for the officer to set. */
function duplicatePayload(drive: PlacementDrive): CreatePlacementDriveDto {
  const r = drive.requirements ?? {};
  return {
    companyName: drive.companyName,
    roleTitle: drive.roleTitle,
    description: drive.description,
    location: drive.location || undefined,
    workMode: drive.workMode || undefined,
    package: drive.package || undefined,
    requirements: {
      minimumCGPA: r.minimumCGPA ?? undefined,
      maximumBacklogs: r.maximumBacklogs ?? undefined,
      graduationYear: r.graduationYear ?? undefined,
      allowedDepartments: r.allowedDepartments?.length ? r.allowedDepartments : undefined,
      skills: (r.skills ?? []).map((s) => ({
        skillId: s.skillId,
        skillName: s.skillName,
        minimumLevel: s.minimumLevel,
        isOptional: s.isOptional,
      })),
    },
  };
}

export default function PlacementDriveDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: drive, isLoading, isError, refetch } = usePlacementDrive(id);
  const publishMutation = usePublishDrive();
  const closeMutation = useCloseDrive();
  const duplicateMutation = useCreateDrive();
  const [activeTab, setActiveTab] = React.useState<TabId>("overview");

  // Ignore scroll tracking while a tab click is smooth-scrolling.
  const lockUntil = React.useRef(0);

  // Highlight the tab of the section currently in view.
  React.useEffect(() => {
    if (!drive) return;
    // On wide screens Recruiter Access sits in the side column beside the
    // main sections, so it only becomes active when its tab is clicked.
    const wide = window.matchMedia("(min-width: 1024px)").matches;
    const sections = TABS.filter((t) => !(wide && t.id === "access"))
      .map((t) => document.getElementById(`drive-${t.id}`))
      .filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < lockUntil.current) return;
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveTab(visible.target.id.replace("drive-", "") as TabId);
      },
      { rootMargin: "-120px 0px -55% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [drive]);

  const scrollTo = (tab: TabId) => {
    lockUntil.current = Date.now() + 1000;
    setActiveTab(tab);
    document.getElementById(`drive-${tab}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1280px] space-y-5 pb-8" aria-label="Loading drive">
        <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-32 animate-pulse rounded-[20px] bg-white" />
        <div className="h-14 animate-pulse rounded-[18px] bg-white" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="h-[520px] animate-pulse rounded-[18px] bg-white" />
          <div className="h-[520px] animate-pulse rounded-[18px] bg-white" />
        </div>
      </div>
    );
  }

  if (!drive) {
    return (
      <div className={cn(driveCardClassName, "mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-14 text-center")}>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF1E8] text-[#FF6500]">
          <SearchX className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="text-lg font-bold text-[#10264A]">{isError ? "Drive could not be loaded" : "Drive not found"}</h1>
        <p className="text-sm text-slate-500">{isError ? "Check your connection and try again." : "This drive may have been removed, or the link is incorrect."}</p>
        <div className="flex gap-2 pt-1">
          {isError && (
            <button type="button" onClick={() => void refetch()} className="h-10 rounded-xl bg-[#FF6500] px-4 text-sm font-semibold text-white hover:bg-[#E85C00]">Try again</button>
          )}
          <Link href="/placement/drives" className="inline-flex h-10 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-[#10264A] hover:bg-slate-50">Back to Drives</Link>
        </div>
      </div>
    );
  }

  const isDraft = drive.status === DriveStatus.DRAFT;
  const isPublished = drive.status === DriveStatus.PUBLISHED;
  const requirements = drive.requirements ?? {};
  const skills = requirements.skills ?? [];
  const requiredCount = skills.filter((s) => !s.isOptional).length;

  const handlePublish = async () => {
    if (!confirm("Are you sure you want to publish this drive? It will become visible to all students.")) return;
    try {
      await publishMutation.mutateAsync(id);
      toast.success("Drive published successfully");
    } catch (e) {
      toast.error(errorMessage(e, "Failed to publish drive. Ensure required fields are complete."));
    }
  };

  const handleClose = async () => {
    if (!confirm("Are you sure you want to close this drive? Students will no longer be able to apply.")) return;
    try {
      await closeMutation.mutateAsync(id);
      toast.success("Drive closed");
    } catch (e) {
      toast.error(errorMessage(e, "Failed to close drive."));
    }
  };

  const handleDuplicate = async () => {
    try {
      const copy = await duplicateMutation.mutateAsync(duplicatePayload(drive));
      toast.success("Drive duplicated as a new draft. Set the dates before publishing.");
      router.push(`/placement/drives/${copy.id}/edit`);
    } catch (e) {
      toast.error(errorMessage(e, "Failed to duplicate drive."));
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Drive link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  const secondaryButton =
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-[#10264A] shadow-sm transition-colors hover:border-[#FFC9A3] hover:bg-[#FFF6F0] disabled:cursor-not-allowed disabled:opacity-55";

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-5 pb-8">
      <Link href="/placement/drives" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#10264A]/70 transition-colors hover:text-[#FF6500]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to Drives
      </Link>

      {/* Header */}
      <header className="pc-enter relative overflow-hidden rounded-[20px] border border-[#FF6500]/15 bg-gradient-to-r from-white via-[#FFF8F3] to-[#FFEBDD] px-5 py-5 shadow-[0_10px_30px_-20px_rgba(255,101,0,0.45)] sm:px-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <CompanyMark name={drive.companyName} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h1 className="truncate text-2xl font-extrabold tracking-tight text-[#10264A] sm:text-[28px]">{drive.companyName}</h1>
                <DriveStatusBadge status={drive.status} />
              </div>
              <p className="mt-1 truncate text-sm font-medium text-[#10264A]/75 sm:text-base">{drive.roleTitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isDraft ? (
              <Link href={`/placement/drives/${id}/edit`} className={secondaryButton}>
                <Pencil className="h-4 w-4" aria-hidden="true" />Edit Drive
              </Link>
            ) : (
              <span title="Only draft drives can be edited" className="inline-flex">
                <Link href={`/placement/drives/${id}/edit`} className={secondaryButton} aria-label="View drive details in the editor (read-only)">
                  <Lock className="h-4 w-4" aria-hidden="true" />Edit Drive
                </Link>
              </span>
            )}
            <button type="button" onClick={() => void handleDuplicate()} disabled={duplicateMutation.isPending} className={secondaryButton}>
              {duplicateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              Duplicate
            </button>
            {isDraft && (
              <button
                type="button"
                onClick={() => void handlePublish()}
                disabled={publishMutation.isPending}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#FF6500] px-4 text-sm font-semibold text-white shadow-[0_10px_22px_-12px_rgba(255,101,0,0.9)] transition-colors hover:bg-[#E85C00] disabled:opacity-60"
              >
                {publishMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Rocket className="h-4 w-4" aria-hidden="true" />}
                {publishMutation.isPending ? "Publishing..." : "Publish Drive"}
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="More drive actions" className={cn(secondaryButton, "w-10 px-0")}>
                  <MoreVertical className="h-4 w-4" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {isDraft && (
                  <DropdownMenuItem onSelect={() => void handlePublish()}>
                    <Send className="mr-2 h-4 w-4" />Publish drive
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => void handleDuplicate()}>
                  <Copy className="mr-2 h-4 w-4" />Duplicate drive
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void copyLink()}>
                  <Link2 className="mr-2 h-4 w-4" />Copy link
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => scrollTo("access")}>
                  <UsersRound className="mr-2 h-4 w-4" />Manage recruiter access
                </DropdownMenuItem>
                {isPublished && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => void handleClose()} className="text-rose-600 focus:bg-rose-50 focus:text-rose-700">
                      <XCircle className="mr-2 h-4 w-4" />Close drive
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Section tabs */}
      <nav aria-label="Drive sections" className={cn(driveCardClassName, "overflow-x-auto px-2 sm:px-3")}>
        <ul className="flex min-w-max items-center gap-1">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => scrollTo(tab.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "relative inline-flex h-14 items-center gap-2 px-3 text-sm font-semibold transition-colors sm:px-4",
                    active ? "text-[#FF6500]" : "text-[#10264A]/75 hover:text-[#10264A]",
                  )}
                >
                  <tab.icon className="h-4 w-4" aria-hidden="true" />
                  {tab.label}
                  <span aria-hidden="true" className={cn("absolute inset-x-3 bottom-0 h-[3px] rounded-t-full transition-colors", active ? "bg-[#FF6500]" : "bg-transparent")} />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main column */}
        <div className="min-w-0 space-y-5">
          <section id="drive-overview" aria-labelledby="about-title" className={cn(driveCardClassName, "scroll-mt-24 p-5 sm:p-6")}>
            <DriveCardTitle id="about-title" icon={FileText} title="About the Role" />
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
              {drive.description || <span className="text-slate-400">No description provided.</span>}
            </p>
          </section>

          <section id="drive-eligibility" aria-labelledby="eligibility-title" className={cn(driveCardClassName, "scroll-mt-24 p-5 sm:p-6")}>
            <DriveCardTitle id="eligibility-title" icon={GraduationCap} title="Eligibility Requirements" description="Students must meet every criterion set here." />
            <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <EligibilityTile icon={Star} label="Min CGPA" value={requirements.minimumCGPA != null && requirements.minimumCGPA !== 0 ? String(requirements.minimumCGPA) : null} empty="No minimum" tone="violet" />
              <EligibilityTile icon={Hash} label="Max Backlogs" value={requirements.maximumBacklogs != null ? String(requirements.maximumBacklogs) : null} empty="No limit" tone="emerald" />
              <EligibilityTile icon={CalendarDays} label="Batch / Year" value={requirements.graduationYear ? String(requirements.graduationYear) : null} empty="Any" tone="blue" />
              <EligibilityTile icon={Layers} label="Departments" value={requirements.allowedDepartments?.length ? requirements.allowedDepartments.join(", ") : null} empty="All" tone="orange" />
            </div>
          </section>

          <section id="drive-skills" aria-labelledby="skills-title" className={cn(driveCardClassName, "scroll-mt-24 p-5 sm:p-6")}>
            <DriveCardTitle
              id="skills-title"
              icon={Code2}
              title="Skill Requirements"
              description={skills.length ? `${requiredCount} required · ${skills.length - requiredCount} optional` : undefined}
            />
            {skills.length ? (
              <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                {skills.map((skill) => (
                  <li key={skill.skillId} className="flex items-center gap-3 bg-white px-4 py-3 transition-colors hover:bg-slate-50/70">
                    <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF2F8] text-sm font-bold text-[#10264A]">
                      {(skill.skillName || "?").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#10264A]">{skill.skillName || skill.skillId}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="whitespace-nowrap text-xs text-slate-500">Min. level {skill.minimumLevel}</span>
                        <span className="flex gap-0.5" aria-hidden="true">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <span key={n} className={cn("h-1.5 w-3.5 rounded-full", n <= skill.minimumLevel ? "bg-[#FF6500]" : "bg-slate-200")} />
                          ))}
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-2 py-1 text-[10px] font-bold tracking-wide",
                        skill.isOptional ? "bg-slate-100 text-slate-600" : "bg-[#FFF1E8] text-[#C24E00] ring-1 ring-[#FFD9BF]",
                      )}
                    >
                      {skill.isOptional ? "OPTIONAL" : "REQUIRED"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNote icon={Code2} title="No skills specified" text="Any student who meets the eligibility criteria can apply." />
            )}
          </section>

          <SkillSupplyCard driveId={id} sectionId="drive-cohort" />
        </div>

        {/* Side column */}
        <aside className="min-w-0 space-y-5">
          <section aria-labelledby="details-title" className={cn(driveCardClassName, "p-5")}>
            <DriveCardTitle id="details-title" icon={BriefcaseBusiness} title="Drive Details" />
            <dl className="mt-4 space-y-3.5">
              <DetailRow icon={MapPin} label="Location" value={drive.location} />
              <DetailRow icon={Laptop} label="Work Mode" value={drive.workMode} />
              <DetailRow icon={BadgeIndianRupee} label="Package / CTC" value={drive.package} />
              <DetailRow icon={CalendarClock} label="Application Start" value={formatDate(drive.applicationStart)} />
              <DetailRow icon={CalendarCheck} label="Drive Date" value={formatDate(drive.driveDate)} empty="To be decided" />
              <DetailRow icon={CalendarDays} label="Application Deadline" value={formatDate(drive.applicationDeadline)} />
            </dl>
          </section>

          <DriveStatusCard
            drive={drive}
            onPublish={() => void handlePublish()}
            onClose={() => void handleClose()}
            publishing={publishMutation.isPending}
            closing={closeMutation.isPending}
          />

          <RecruiterAccessManager driveId={id} sectionId="drive-access" />
          <RecruiterAccessLogCard driveId={id} />
        </aside>
      </div>
    </div>
  );
}

const TILE_TONES = {
  violet: "bg-violet-50/70 text-violet-600 ring-violet-100",
  emerald: "bg-emerald-50/70 text-emerald-600 ring-emerald-100",
  blue: "bg-blue-50/70 text-blue-600 ring-blue-100",
  orange: "bg-[#FFF6F0] text-[#FF6500] ring-[#FFE0CC]",
};

function EligibilityTile({
  icon: Icon,
  label,
  value,
  empty,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null;
  empty: string;
  tone: keyof typeof TILE_TONES;
}) {
  return (
    <div className={cn("flex min-h-[112px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-4 text-center ring-1", TILE_TONES[tone])}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <p className={cn("max-w-full truncate font-extrabold", value ? "text-xl text-[#10264A]" : "text-sm text-slate-500")} title={value ?? empty}>
        {value ?? empty}
      </p>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, empty = "Not specified" }: { icon: React.ElementType; label: string; value?: string | null; empty?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF6F0] text-[#FF6500]">
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-sm font-semibold text-[#10264A]">{label}</dt>
        <dd className={cn("truncate text-sm", value ? "text-slate-600" : "text-slate-400")}>{value || empty}</dd>
      </div>
    </div>
  );
}

function DriveStatusCard({
  drive,
  onPublish,
  onClose,
  publishing,
  closing,
}: {
  drive: PlacementDrive;
  onPublish: () => void;
  onClose: () => void;
  publishing: boolean;
  closing: boolean;
}) {
  const meta = STATUS_META[drive.status] ?? STATUS_META[DriveStatus.DRAFT];
  // A published drive still follows its application window.
  const [now] = React.useState(() => Date.now());
  const windowState = drive.status === DriveStatus.PUBLISHED ? getWindowState(drive, now) : null;
  const deadline = formatDate(drive.applicationDeadline);
  const opens = formatDate(drive.applicationStart);

  let message: string;
  switch (drive.status) {
    case DriveStatus.DRAFT:
      message = "Not visible to students yet. Publish the drive when its details are complete.";
      break;
    case DriveStatus.CLOSED:
      message = "Applications are no longer being accepted for this drive.";
      break;
    case DriveStatus.CANCELLED:
      message = "This drive was cancelled. Students cannot apply.";
      break;
    default:
      message =
        windowState === "CLOSED"
          ? `The application deadline${deadline ? ` (${deadline})` : ""} has passed, so students can no longer apply.`
          : windowState === "NOT_OPEN"
            ? `Visible to students. Applications open${opens ? ` on ${opens}` : " soon"}.`
            : windowState === "CLOSING_SOON"
              ? `Accepting applications. Closing soon${deadline ? `: ${deadline}` : ""}.`
              : `Accepting applications${deadline ? ` until ${deadline}` : ""}.`;
  }

  return (
    <section aria-labelledby="status-title" className={cn(driveCardClassName, "p-5")}>
      <DriveCardTitle id="status-title" icon={CircleCheck} title="Drive Status" />
      <div className={cn("mt-4 flex flex-col items-center gap-2 rounded-2xl px-4 py-5 text-center ring-1", meta.panel)}>
        <span className="inline-flex items-center gap-2 text-lg font-extrabold uppercase tracking-wide">
          <meta.icon className="h-5 w-5" aria-hidden="true" />
          {meta.label}
        </span>
        <p className="text-sm leading-5 opacity-90">{message}</p>
      </div>
      {drive.status === DriveStatus.DRAFT && (
        <button
          type="button"
          onClick={onPublish}
          disabled={publishing}
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6500] text-sm font-semibold text-white shadow-[0_10px_22px_-12px_rgba(255,101,0,0.9)] hover:bg-[#E85C00] disabled:opacity-60"
        >
          {publishing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Rocket className="h-4 w-4" aria-hidden="true" />}
          {publishing ? "Publishing..." : "Publish Drive"}
        </button>
      )}
      {drive.status === DriveStatus.PUBLISHED && (
        <button
          type="button"
          onClick={onClose}
          disabled={closing}
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
        >
          {closing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
          Close Drive
        </button>
      )}
    </section>
  );
}

function EmptyNote({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-[#10264A]">{title}</p>
      <p className="text-xs text-slate-500">{text}</p>
    </div>
  );
}
