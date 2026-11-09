'use client';

import * as React from 'react';
import { KeyRound, Settings, UserRound } from 'lucide-react';
import { useAuth } from '@/features/auth/components/auth-provider';
import { ChangePasswordForm } from '@/features/settings/components/change-password-form';

export default function PlacementSettingsPage() {
  const { user } = useAuth();
  const [changingPassword, setChangingPassword] = React.useState(false);
  const fields = [
    ['Full name', user?.fullName],
    ['Email address', user?.email],
    ['Role', 'Placement Officer'],
    ['Department', user?.department],
    ['Designation', user?.designation],
  ].filter((entry) => Boolean(entry[1]));

  return <div className="mx-auto max-w-4xl space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Placement / Account</p><h1 className="mt-2 text-3xl font-bold text-[#142b4d]">Settings</h1><p className="mt-1 text-sm text-slate-600">View your placement account details and manage your password.</p></header>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#f15a24]"><UserRound className="h-5 w-5" /></span><div><h2 className="font-semibold text-[#142b4d]">Account information</h2><p className="text-sm text-slate-500">Managed by your institution</p></div></div>
      <dl className="grid gap-4 pt-5 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label}><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium text-[#142b4d]">{value}</dd></div>)}</dl>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#f15a24]"><KeyRound className="h-5 w-5" /></span><div><h2 className="font-semibold text-[#142b4d]">Password and security</h2><p className="text-sm text-slate-500">Use a strong password to keep your account secure.</p></div></div>
      {changingPassword ? <ChangePasswordForm onDone={() => setChangingPassword(false)} /> : <button onClick={() => setChangingPassword(true)} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-[#142b4d] transition hover:border-orange-200 hover:bg-orange-50"><Settings className="h-4 w-4" />Change password</button>}
    </section>
  </div>;
}
