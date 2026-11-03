"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  CircleCheck,
  FileText,
  Github,
  Globe,
  GraduationCap,
  Link2,
  Linkedin,
  Loader2,
  NotebookPen,
  PencilLine,
  Phone,
  RotateCcw,
  Save,
  UserRound,
} from "lucide-react";
import type {
  StudentProfile,
  UpdateStudentProfileDto,
} from "@placecampus/shared-types";
import {
  useStudentProfile,
  useUpdateStudentProfile,
} from "@/features/student/hooks/use-student-profile";
import { useAuth } from "@/features/auth/components/auth-provider";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfileCompletion } from "@/features/student/lib/profile-completion";
import { ProfileOverview } from "@/features/student/components/profile/profile-overview";
import { ProfileSectionCard } from "@/features/student/components/profile/profile-section-card";
import { AcademicDetailsCard } from "@/features/student/components/profile/academic-details-card";
import { ResumeCard } from "@/features/student/components/profile/resume-card";
import {
  IconInputField,
  IconTextareaField,
  SocialLinkField,
  isHttpUrl,
} from "@/features/student/components/profile/profile-fields";

const BIO_MAX_LENGTH = 500;

const optionalUrl = (name: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) => value === "" || isHttpUrl(value),
      `Enter a valid ${name} URL starting with https://`,
    );

const profileSchema = z.object({
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\+?[\d\s()-]{10,15}$/.test(value),
      "Use 10–15 characters: digits, spaces, +, ( ) or -",
    ),
  bio: z
    .string()
    .trim()
    .max(BIO_MAX_LENGTH, `Bio must be ${BIO_MAX_LENGTH} characters or fewer`),
  linkedinUrl: optionalUrl("LinkedIn"),
  githubUrl: optionalUrl("GitHub"),
  portfolioUrl: optionalUrl("portfolio"),
});

type ProfileValues = z.infer<typeof profileSchema>;

const toFormValues = (profile?: StudentProfile): ProfileValues => ({
  phone: profile?.phone || "",
  bio: profile?.bio || "",
  linkedinUrl: profile?.linkedinUrl || "",
  githubUrl: profile?.githubUrl || "",
  portfolioUrl: profile?.portfolioUrl || "",
});

const SECTIONS = [
  { id: "personal-info", label: "Personal Info", icon: UserRound },
  { id: "academic-details", label: "Academic Details", icon: GraduationCap },
  { id: "links-social", label: "Links & Social", icon: Link2 },
  { id: "resume", label: "Resume", icon: FileText },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const delay = (ms: number) =>
  ({ "--pc-delay": `${ms}ms` }) as React.CSSProperties;

/** Highlight for the section the student just jumped to. */
const SPOTLIGHT_CLASS =
  "ring-2 ring-[hsl(var(--primary)/0.45)] ring-offset-2 ring-offset-[hsl(var(--background))]";

function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6" aria-busy="true">
      <span className="sr-only">Loading profile…</span>
      <Skeleton className="h-[190px] w-full rounded-[20px]" />
      <div className="flex gap-3">
        {SECTIONS.map((section) => (
          <Skeleton key={section.id} className="h-11 w-36 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {SECTIONS.map((section) => (
          <Skeleton key={section.id} className="h-72 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function StudentProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useStudentProfile();
  const updateMutation = useUpdateStudentProfile();

  const [activeSection, setActiveSection] =
    React.useState<SectionId>("personal-info");
  const [spotlight, setSpotlight] = React.useState<SectionId | null>(null);
  const [justSaved, setJustSaved] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    control,
    formState: { errors, isSubmitting, isDirty, dirtyFields },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: "onTouched",
    defaultValues: toFormValues(),
  });

  const [bio, linkedinUrl, githubUrl, portfolioUrl] = useWatch({
    control,
    name: ["bio", "linkedinUrl", "githubUrl", "portfolioUrl"],
  });

  React.useEffect(() => {
    if (profile) {
      // Keep anything the student is mid-way through editing if the profile refetches.
      reset(toFormValues(profile), { keepDirtyValues: true });
    }
  }, [profile, reset]);

  // Warn before losing unsaved changes (tab close/reload and in-app links).
  React.useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const handleLinkClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor || anchor.target === "_blank" || !anchor.href) return;
      const url = new URL(anchor.href);
      if (
        url.origin !== window.location.origin ||
        url.pathname === window.location.pathname
      )
        return;
      if (
        !window.confirm("You have unsaved changes. Leave without saving?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("click", handleLinkClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("click", handleLinkClick, true);
    };
  }, [isDirty]);

  React.useEffect(() => {
    if (!spotlight) return;
    const timeout = window.setTimeout(() => setSpotlight(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [spotlight]);

  const goToSection = (id: SectionId) => {
    setActiveSection(id);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    setSpotlight(null);
    requestAnimationFrame(() => setSpotlight(id));
  };

  const startEditing = () => {
    setActiveSection("personal-info");
    setFocus("phone");
  };

  const onSubmit = async (values: ProfileValues) => {
    // Send only what changed; an emptied field is sent as null to clear it.
    const payload: UpdateStudentProfileDto = {};
    for (const key of Object.keys(dirtyFields) as (keyof ProfileValues)[]) {
      payload[key] = values[key] || null;
    }
    if (Object.keys(payload).length === 0) return;

    try {
      await updateMutation.mutateAsync(payload);
      setJustSaved(true);
      toast.success("Profile updated", {
        description: "Your changes have been saved.",
      });
    } catch (error) {
      const detail =
        error instanceof ApiError
          ? error.errors?.validation?.[0] || error.message
          : "Please check your connection and try again.";
      toast.error("Couldn't save your profile", { description: detail });
    }
  };

  const handleDiscard = () => {
    reset(toFormValues(profile));
    setJustSaved(false);
    toast("Changes discarded");
  };

  if (isLoading) return <ProfileSkeleton />;

  const completion = getProfileCompletion(profile);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <ProfileOverview
        name={user?.fullName || "Student"}
        email={user?.email}
        completion={completion}
        onEdit={startEditing}
      />

      {/* Section navigation */}
      <div
        className="pc-enter flex items-center justify-between gap-4"
        style={delay(60)}
      >
        <nav
          aria-label="Profile sections"
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0"
        >
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => goToSection(id)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)]",
                  isActive
                    ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                    : "text-[hsl(var(--foreground)/0.75)] hover:bg-white hover:text-[hsl(var(--foreground))] hover:shadow-[var(--shadow-xs)]",
                )}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={startEditing}
          className="hidden shrink-0 items-center gap-2 rounded-xl border border-[hsl(var(--primary)/0.5)] bg-white px-4 py-2.5 text-sm font-semibold text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--primary)/0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] lg:inline-flex"
        >
          <PencilLine className="h-4 w-4" aria-hidden="true" />
          Edit Profile
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ProfileSectionCard
            id="personal-info"
            style={delay(100)}
            className={cn(spotlight === "personal-info" && SPOTLIGHT_CLASS)}
            icon={UserRound}
            title="Personal Information"
            description="Your basic personal details and a short introduction."
          >
            <div className="space-y-5">
              <IconInputField
                id="phone"
                label="Phone Number"
                icon={Phone}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+1234567890"
                registration={register("phone")}
                error={errors.phone?.message}
              />
              <IconTextareaField
                id="bio"
                label="Bio / About Me"
                icon={NotebookPen}
                placeholder="Tell recruiters about your interests, strengths, and what you're working towards…"
                registration={register("bio")}
                length={bio?.length ?? 0}
                maxLength={BIO_MAX_LENGTH}
                error={errors.bio?.message}
              />
            </div>
          </ProfileSectionCard>

          <AcademicDetailsCard
            id="academic-details"
            style={delay(160)}
            className={cn(spotlight === "academic-details" && SPOTLIGHT_CLASS)}
            profile={profile}
          />

          <ProfileSectionCard
            id="links-social"
            style={delay(220)}
            className={cn(spotlight === "links-social" && SPOTLIGHT_CLASS)}
            icon={Link2}
            title="Links & Social"
            description="Add your professional and project links."
          >
            <div className="space-y-3">
              <SocialLinkField
                id="linkedinUrl"
                label="LinkedIn"
                icon={Linkedin}
                iconClassName="bg-[#0A66C2] text-white"
                placeholder="https://linkedin.com/in/username"
                registration={register("linkedinUrl")}
                value={linkedinUrl}
                error={errors.linkedinUrl?.message}
              />
              <SocialLinkField
                id="githubUrl"
                label="GitHub"
                icon={Github}
                iconClassName="bg-[#181717] text-white"
                placeholder="https://github.com/username"
                registration={register("githubUrl")}
                value={githubUrl}
                error={errors.githubUrl?.message}
              />
              <SocialLinkField
                id="portfolioUrl"
                label="Portfolio"
                icon={Globe}
                iconClassName="bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]"
                placeholder="https://yourportfolio.com"
                registration={register("portfolioUrl")}
                value={portfolioUrl}
                error={errors.portfolioUrl?.message}
              />
            </div>
          </ProfileSectionCard>

          <ResumeCard
            id="resume"
            style={delay(280)}
            className={cn(spotlight === "resume" && SPOTLIGHT_CLASS)}
          />
        </div>

        {/* Sticky save bar */}
        {/* On small screens it only floats while there is something to save. */}
        <div
          className={cn(
            "sticky bottom-3 z-20 mt-6 sm:bottom-4",
            !isDirty && "max-sm:static",
          )}
        >
          <div
            className={cn(
              "flex flex-col gap-3 rounded-2xl border bg-white/95 p-3 shadow-[var(--shadow-xl)] backdrop-blur-md transition-colors duration-300 sm:flex-row sm:items-center sm:justify-between sm:pl-5",
              isDirty
                ? "border-[hsl(var(--primary)/0.35)]"
                : "border-[hsl(var(--border)/0.8)]",
            )}
          >
            <p
              aria-live="polite"
              className="flex items-center gap-2.5 text-sm text-[hsl(var(--muted-foreground))]"
            >
              {isDirty ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--primary)/0.5)] motion-reduce:animate-none" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary))]" />
                  </span>
                  <span className="font-medium text-[hsl(var(--foreground))]">
                    You have unsaved changes
                  </span>
                </>
              ) : justSaved ? (
                <>
                  <CircleCheck
                    className="pc-pop h-5 w-5 text-emerald-600"
                    aria-hidden="true"
                  />
                  <span className="font-medium text-emerald-700">
                    All changes saved
                  </span>
                </>
              ) : (
                <>
                  <CircleCheck
                    className="h-5 w-5 text-emerald-600"
                    aria-hidden="true"
                  />
                  Your profile is up to date.
                </>
              )}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={handleDiscard}
                disabled={!isDirty || isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white px-5 py-2.5 text-sm font-semibold text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Discard
              </button>
              <button
                type="submit"
                disabled={!isDirty || isSubmitting}
                className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_-6px_hsl(var(--primary)/0.7)] transition-all hover:bg-[hsl(var(--color-primary-600))] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[hsl(var(--primary)/0.45)] disabled:shadow-none disabled:active:scale-100"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                {isSubmitting ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
