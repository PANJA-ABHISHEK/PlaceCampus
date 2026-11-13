'use client';

import * as React from 'react';
import { KeyRound, UserRound } from 'lucide-react';
import { useAuth } from '@/features/auth/components/auth-provider';
import { ChangePasswordForm } from '@/features/settings/components/change-password-form';

export default function RecruiterSettingsPage() {
  const { user } = useAuth();
  const [changingPassword, setChangingPassword] = React.useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Recruiter account</p>
        <h1 className="mt-1 text-3xl font-bold text-[#142b4d]">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Review your account details and update your sign-in password.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#e9570c]"><UserRound className="h-5 w-5" /></span>
          <div><h2 className="font-semibold text-[#142b4d]">Account information</h2><p className="text-sm text-slate-500">Managed by your organization</p></div>
        </div>
        <dl className="grid gap-4 pt-5 sm:grid-cols-2">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</dt><dd className="mt-1 text-sm font-medium text-[#142b4d]">{user?.fullName || '—'}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt><dd className="mt-1 break-all text-sm font-medium text-[#142b4d]">{user?.email || '—'}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</dt><dd className="mt-1 text-sm font-medium text-[#142b4d]">Recruiter</dd></div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#e9570c]"><KeyRound className="h-5 w-5" /></span>
          <div><h2 className="font-semibold text-[#142b4d]">Password and security</h2><p className="text-sm text-slate-500">Change the password used to sign in.</p></div>
        </div>
        {changingPassword ? <ChangePasswordForm onDone={() => setChangingPassword(false)} /> : <button type="button" onClick={() => setChangingPassword(true)} className="mt-5 h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-[#142b4d] transition hover:border-orange-200 hover:bg-orange-50">Change password</button>}
      </section>
    </div>
  );
}
