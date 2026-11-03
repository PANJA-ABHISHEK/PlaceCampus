'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Check,
  ChevronRight,
  GraduationCap,
  Loader2,
  ShieldCheck,
  UserRoundCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { UserRole } from '@placecampus/shared-types';
import { AuthFeedback } from './auth-feedback';
import { reveal } from './auth-submit-button';
import { useAuth } from './auth-provider';
import { apiClient, ApiError } from '@/lib/api-client';
import { CAMPUS_LOGIN_ROUTE, ROLE_LABELS, getDashboardRoute } from '@/lib/routes';
import { cn } from '@/lib/utils';

const ROLE_META: Record<string, { icon: LucideIcon; description: string }> = {
  [UserRole.STUDENT]: { icon: GraduationCap, description: 'Evidence, skills, readiness and placement drives' },
  [UserRole.FACULTY]: { icon: Users, description: 'Review evidence and run mock interviews' },
  [UserRole.PLACEMENT_OFFICER]: { icon: Briefcase, description: 'Manage drives, eligibility and applications' },
  [UserRole.PLACEMENT_HEAD]: { icon: UserRoundCog, description: 'Approvals, recruiter access and placement reports' },
  [UserRole.ADMIN]: { icon: ShieldCheck, description: 'Accounts, roles and platform administration' },
};

/**
 * AUTH-08: a user with several campus role assignments picks the role this
 * session acts as. Only the user's own assignments (from the API) are listed.
 */
export function SelectRoleForm() {
  const router = useRouter();
  const { user, loading, authenticated, setAuth, clearAuth } = useAuth();
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const roles = user?.roles ?? (user ? [user.role] : []);
  const activeRole = user?.activeRole ?? null;

  React.useEffect(() => {
    if (loading) return;
    if (!authenticated) router.replace(CAMPUS_LOGIN_ROUTE);
    // Nothing to choose: a single-role account goes straight to its dashboard.
    else if (user && roles.length <= 1) router.replace(getDashboardRoute(user.role));
  }, [loading, authenticated, user, roles.length, router]);

  const choose = async (role: string) => {
    setError(null);
    setPending(role);
    try {
      if (role !== activeRole) {
        const res = await apiClient.post<{ accessToken: string }>('/auth/active-role', { role });
        await setAuth(res.accessToken);
      }
      router.replace(getDashboardRoute(role));
    } catch (err) {
      setPending(null);
      setError(err instanceof ApiError ? err.message : 'Could not switch role. Please try again.');
    }
  };

  if (loading || !authenticated || roles.length <= 1) {
    return (
      <div className="flex justify-center py-16" aria-busy="true">
        <Loader2 aria-label="Loading" className="h-6 w-6 animate-spin text-[hsl(var(--primary))] motion-reduce:animate-none" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 {...reveal(0, 'text-heading text-3xl font-bold tracking-tight')}>Choose your role</h2>
        <p {...reveal(1, 'text-body text-sm text-[hsl(var(--muted-foreground))]')}>
          {user?.fullName ? `${user.fullName}, your` : 'Your'} account has more than one role. Pick the one you want to use now. You can switch later from your account menu.
        </p>
      </div>

      <AuthFeedback message={error} variant="banner" className="-mb-4 data-[open=true]:mb-0" />

      <ul className="flex flex-col gap-3" aria-label="Your roles">
        {roles.map((role, index) => {
          const meta = ROLE_META[role] ?? { icon: Users, description: '' };
          const Icon = meta.icon;
          const current = role === activeRole;
          const busy = pending === role;
          return (
            <li key={role} {...reveal(2 + index)}>
              <button
                type="button"
                onClick={() => choose(role)}
                disabled={pending !== null}
                aria-current={current ? 'true' : undefined}
                className={cn(
                  'group flex w-full items-center gap-4 rounded-xl border bg-[hsl(var(--background))] p-4 text-left transition-[border-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.5)] hover:shadow-[0_12px_24px_-16px_hsl(var(--primary)/0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 disabled:cursor-wait disabled:hover:translate-y-0',
                  current ? 'border-[hsl(var(--primary)/0.5)] bg-[hsl(var(--primary)/0.04)]' : 'border-[hsl(var(--border))]',
                )}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-semibold text-[hsl(var(--foreground))]">
                    {ROLE_LABELS[role] ?? role}
                    {current && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        <Check className="h-3 w-3" aria-hidden="true" /> Current
                      </span>
                    )}
                  </span>
                  {meta.description && (
                    <span className="mt-0.5 block text-sm text-[hsl(var(--muted-foreground))]">{meta.description}</span>
                  )}
                </span>
                {busy ? (
                  <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-[hsl(var(--primary))] motion-reduce:animate-none" />
                ) : (
                  <ChevronRight aria-hidden="true" className="h-5 w-5 text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5 group-hover:text-[hsl(var(--primary))]" />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={async () => {
          await clearAuth();
          router.replace(CAMPUS_LOGIN_ROUTE);
        }}
        disabled={pending !== null}
        {...reveal(2 + roles.length, 'self-center rounded-sm text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]')}
      >
        Sign in with a different account
      </button>
    </div>
  );
}
