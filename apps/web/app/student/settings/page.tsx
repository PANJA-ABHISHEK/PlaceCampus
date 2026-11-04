"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Bell,
  CircleAlert,
  KeyRound,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  Palette,
  PencilLine,
  RotateCcw,
  Settings as SettingsIcon,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react";
import type {
  StudentNotificationPreferences,
  StudentPrivacyPreferences,
  ThemePreference,
  UpdateStudentPreferencesDto,
} from "@placecampus/shared-types";
import { useAuth } from "@/features/auth/components/auth-provider";
import {
  useStudentSettings,
  useUpdatePreferences,
} from "@/features/settings/hooks/use-student-settings";
import {
  DetailItem,
  SettingsSection,
  SwitchRow,
  settingsCard,
} from "@/features/settings/components/settings-ui";
import { ChangePasswordForm } from "@/features/settings/components/change-password-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const NOTIFICATION_ROWS: {
  key: keyof StudentNotificationPreferences;
  label: string;
  description: string;
}[] = [
  { key: "email", label: "Email notifications", description: "Also send these updates to your email address." },
  { key: "driveAnnouncements", label: "Placement drive announcements", description: "When a new placement drive is published." },
  { key: "applicationUpdates", label: "Application status updates", description: "When you apply, and when a recruiter moves your application." },
  { key: "assessmentUpdates", label: "Assessment results", description: "When an assessment you took has been evaluated." },
  { key: "interviewUpdates", label: "Interview notifications", description: "Mock interviews scheduled, cancelled, or given feedback." },
];

const PRIVACY_LINKS: {
  key: Exclude<keyof StudentPrivacyPreferences, "shareProfileLinks">;
  label: string;
  description: string;
}[] = [
  { key: "showLinkedin", label: "LinkedIn profile", description: "Show your LinkedIn URL to recruiters." },
  { key: "showGithub", label: "GitHub profile", description: "Show your GitHub URL to recruiters." },
  { key: "showPortfolio", label: "Portfolio website", description: "Show your portfolio URL to recruiters." },
];

const THEMES: { value: ThemePreference; label: string; icon: React.ElementType; hint: string }[] = [
  { value: "light", label: "Light", icon: Sun, hint: "Bright and clean" },
  { value: "dark", label: "Dark", icon: Moon, hint: "Easier in low light" },
  { value: "system", label: "System", icon: Monitor, hint: "Match your device" },
];

const SECTIONS = [
  { id: "account", label: "Account" },
  { id: "notifications", label: "Notifications" },
  { id: "privacy", label: "Privacy" },
  { id: "appearance", label: "Appearance" },
  { id: "account-actions", label: "Account actions" },
];

function formatDate(value?: string) {
  return value
    ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : undefined;
}

export default function StudentSettingsPage() {
  const router = useRouter();
  const { clearAuth } = useAuth();
  const { setTheme } = useTheme();
  const settingsQuery = useStudentSettings();
  const updatePreferences = useUpdatePreferences();
  const [changingPassword, setChangingPassword] = React.useState(false);
  const [confirmLogout, setConfirmLogout] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const settings = settingsQuery.data;
  const prefs = settings?.preferences;

  const save = (dto: UpdateStudentPreferencesDto, successMessage: string) =>
    updatePreferences.mutate(dto, {
      onSuccess: () => toast.success(successMessage),
      onError: (error) =>
        toast.error(error instanceof ApiError ? error.message : "Could not save your settings. Please try again."),
    });

  const onTheme = (theme: ThemePreference) => {
    if (theme === prefs?.theme) return;
    const previous = prefs?.theme;
    setTheme(theme);
    updatePreferences.mutate(
      { theme },
      {
        onSuccess: () => toast.success(`${THEMES.find((t) => t.value === theme)?.label} theme saved`),
        onError: () => {
          if (previous) setTheme(previous);
          toast.error("Could not save your theme. Please try again.");
        },
      },
    );
  };

  const onLogout = async () => {
    setLoggingOut(true);
    await clearAuth();
    router.replace("/login");
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <header className="pc-enter flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
          <SettingsIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] md:text-3xl">Settings</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Manage your account, notifications, privacy and appearance.
          </p>
        </div>
      </header>

      {settingsQuery.isLoading ? (
        <div className="space-y-6" aria-busy="true">
          <span className="sr-only">Loading settings…</span>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[220px] rounded-2xl" />
          ))}
        </div>
      ) : settingsQuery.isError || !settings || !prefs ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center dark:border-red-500/30 dark:bg-red-500/10">
          <CircleAlert className="h-8 w-8 text-red-600" aria-hidden="true" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-200">We couldn&apos;t load your settings</p>
            <p className="mt-1 text-sm text-red-800/80 dark:text-red-200/80">
              {settingsQuery.error instanceof Error ? settingsQuery.error.message : "Please try again."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => settingsQuery.refetch()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
          {/* Section index (sticky on desktop, scrollable chips on mobile) */}
          <nav aria-label="Settings sections" className="min-w-0 lg:sticky lg:top-[96px] lg:self-start">
            <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible">
              {SECTIONS.map((section) => (
                <li key={section.id} className="shrink-0">
                  <a
                    href={`#${section.id}`}
                    className="block rounded-xl px-3.5 py-2 text-sm font-medium text-[hsl(var(--foreground)/0.75)] transition-colors hover:bg-white hover:text-[hsl(var(--primary))] hover:shadow-[var(--shadow-xs)] max-lg:border max-lg:border-[hsl(var(--border))] max-lg:bg-[hsl(var(--card))]"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 space-y-6">
            {/* A. Account */}
            <SettingsSection
              id="account"
              icon={UserRound}
              title="Account"
              description="Your registration details are managed by your institution."
            >
              <dl className="grid grid-cols-1 gap-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="Full name" value={settings.account.fullName} />
                <DetailItem label="Email address" value={settings.account.email} />
                <DetailItem label="Registration number" value={settings.account.registrationNumber} />
                <DetailItem label="University" value={settings.account.university} />
                <DetailItem label="Department" value={settings.account.department} />
                <DetailItem label="Programme" value={settings.account.program} />
                <DetailItem label="Batch" value={settings.account.batch} />
                <DetailItem label="Graduation year" value={settings.account.graduationYear} />
                <DetailItem label="Member since" value={formatDate(settings.account.createdAt)} />
              </dl>
              <div className="mt-2 flex flex-col gap-3 rounded-xl bg-[hsl(var(--muted)/0.6)] p-4 sm:flex-row sm:items-center">
                <p className="flex-1 text-sm text-[hsl(var(--muted-foreground))]">
                  You can edit your phone number, bio and profile links on your profile. To correct your name,
                  email or registration details, contact your placement office.
                </p>
                <Link
                  href="/student/profile"
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white px-4 text-sm font-semibold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/0.4)] hover:text-[hsl(var(--primary))]"
                >
                  <PencilLine className="h-4 w-4" aria-hidden="true" />
                  Edit profile
                </Link>
              </div>

              <div className="mt-5 border-t border-[hsl(var(--border)/0.8)] pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[hsl(var(--foreground))]">Password</p>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Changing it signs you out everywhere else.
                    </p>
                  </div>
                  {!changingPassword && (
                    <button
                      type="button"
                      onClick={() => setChangingPassword(true)}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-white px-4 text-sm font-semibold text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary)/0.4)] hover:text-[hsl(var(--primary))]"
                    >
                      <KeyRound className="h-4 w-4" aria-hidden="true" />
                      Change password
                    </button>
                  )}
                </div>
                {changingPassword && <ChangePasswordForm onDone={() => setChangingPassword(false)} />}
              </div>
            </SettingsSection>

            {/* B. Notifications */}
            <SettingsSection
              id="notifications"
              icon={Bell}
              title="Notification preferences"
              description="Choose which updates reach your notification inbox. Changes save instantly."
              delay={60}
            >
              <div className="divide-y divide-[hsl(var(--border)/0.8)]">
                {NOTIFICATION_ROWS.map((row) => (
                  <SwitchRow
                    key={row.key}
                    id={`notif-${row.key}`}
                    label={row.label}
                    description={row.description}
                    checked={prefs.notifications[row.key]}
                    note={
                      row.key === "email" && !settings.emailDeliveryAvailable
                        ? "Email delivery isn't enabled on PlaceCampus yet. Your choice is saved and applies once it is."
                        : undefined
                    }
                    onCheckedChange={(value) =>
                      save(
                        { notifications: { [row.key]: value } },
                        `${row.label} ${value ? "turned on" : "turned off"}`,
                      )
                    }
                  />
                ))}
              </div>
              <p className="pt-2 text-xs text-[hsl(var(--muted-foreground))]">
                Evidence review results and mentor changes are always delivered.
              </p>
            </SettingsSection>

            {/* C. Privacy */}
            <SettingsSection
              id="privacy"
              icon={ShieldCheck}
              title="Privacy"
              description="Control which of your personal links recruiters can see."
              delay={120}
            >
              <div className="divide-y divide-[hsl(var(--border)/0.8)]">
                <SwitchRow
                  id="privacy-share"
                  label="Share profile links with recruiters"
                  description="When off, recruiters never see your LinkedIn, GitHub or portfolio links."
                  checked={prefs.privacy.shareProfileLinks}
                  onCheckedChange={(value) =>
                    save(
                      { privacy: { shareProfileLinks: value } },
                      value ? "Profile links can be shared with recruiters" : "Profile links hidden from recruiters",
                    )
                  }
                />
                <div className={cn("pl-0 sm:pl-4", !prefs.privacy.shareProfileLinks && "opacity-60")}>
                  {PRIVACY_LINKS.map((row) => (
                    <SwitchRow
                      key={row.key}
                      id={`privacy-${row.key}`}
                      label={row.label}
                      description={row.description}
                      checked={prefs.privacy.shareProfileLinks && prefs.privacy[row.key]}
                      disabled={!prefs.privacy.shareProfileLinks}
                      onCheckedChange={(value) =>
                        save(
                          { privacy: { [row.key]: value } },
                          `${row.label} ${value ? "visible to" : "hidden from"} recruiters`,
                        )
                      }
                    />
                  ))}
                </div>
              </div>
              <p className="pt-2 text-xs text-[hsl(var(--muted-foreground))]">
                Recruiters only ever see candidates for drives your placement office has shared with them. Your
                name, academic details and skill match are shared under your institution&apos;s placement policy.
              </p>
            </SettingsSection>

            {/* D. Appearance */}
            <SettingsSection
              id="appearance"
              icon={Palette}
              title="Appearance"
              description="Saved to your account, so it follows you on every device."
              delay={180}
            >
              <div role="radiogroup" aria-label="Theme" className="grid gap-3 py-3 sm:grid-cols-3">
                {THEMES.map((option) => {
                  const selected = prefs.theme === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onTheme(option.value)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.5)]",
                        selected
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)]"
                          : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.4)]",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          selected
                            ? "bg-[hsl(var(--primary))] text-white"
                            : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
                        )}
                      >
                        <option.icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-[hsl(var(--foreground))]">{option.label}</span>
                        <span className="block text-xs text-[hsl(var(--muted-foreground))]">{option.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                The theme applies to the student portal. Sign-in pages stay light.
              </p>
            </SettingsSection>

            {/* E. Account actions */}
            <SettingsSection
              id="account-actions"
              icon={LogOut}
              title="Account actions"
              description="Sign out of PlaceCampus on this device."
              delay={240}
            >
              <div className="flex flex-col gap-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Student accounts are created and closed by your institution, so they can&apos;t be deleted
                  here. Contact your placement office to deactivate your account.
                </p>
                <button
                  type="button"
                  onClick={() => setConfirmLogout(true)}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/40 dark:text-red-400"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Log out
                </button>
              </div>
            </SettingsSection>
          </div>
        </div>
      )}

      <Dialog open={confirmLogout} onOpenChange={(open) => !loggingOut && setConfirmLogout(open)}>
        <DialogContent className={cn(settingsCard, "max-w-md")}>
          <DialogHeader>
            <DialogTitle>Log out of PlaceCampus?</DialogTitle>
            <DialogDescription>You&apos;ll need your email and password to sign in again.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setConfirmLogout(false)}
              disabled={loggingOut}
              className="h-10 rounded-xl px-4 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onLogout}
              disabled={loggingOut}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {loggingOut && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Log out
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
