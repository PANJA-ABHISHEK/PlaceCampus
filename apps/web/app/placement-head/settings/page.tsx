"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, KeyRound, Settings, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { ChangePasswordForm } from "@/features/settings/components/change-password-form";
import { NAVY, PageHero, Panel } from "@/features/placement-head/components/head-ui";

export default function PlacementHeadSettingsPage() {
  const { user } = useAuth();
  const [changingPassword, setChangingPassword] = React.useState(false);
  const fields = [
    ["Full name", user?.fullName],
    ["Email address", user?.email],
    ["Role", "Placement Head"],
    ["Department", user?.department],
    ["Designation", user?.designation],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <div className="-mt-1 mx-auto max-w-4xl space-y-5 sm:-mt-2 lg:-mt-4">
      <PageHero eyebrow="Account" title="Account" highlight="Settings" icon={Settings}
        description="View your account details and manage your password." />

      <Panel title="Account information" description="Managed by your institution" icon={UserRound}>
        <dl className="grid gap-4 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50/70 px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="mt-1 truncate text-sm font-semibold" style={{ color: NAVY }} title={value}>{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="Password and security" description="Use a strong password to keep your account secure." icon={KeyRound}>
        {changingPassword ? (
          <ChangePasswordForm onDone={() => setChangingPassword(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setChangingPassword(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold transition hover:border-orange-200 hover:bg-orange-50 hover:text-[#E25A00]"
            style={{ color: NAVY }}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Change password
          </button>
        )}
      </Panel>

      <Panel title="Notifications" description="Placement updates and alerts sent to you" icon={Bell}>
        <p className="text-sm text-slate-600">
          Your notifications are available from the bell in the top bar.{" "}
          <Link href="/placement-head/notifications" className="font-semibold text-[#E25A00] hover:underline">
            Open notifications
          </Link>
        </p>
      </Panel>
    </div>
  );
}
