'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  BriefcaseBusiness,
  Building2,
  ChartNoAxesColumnIncreasing,
  Check,
  GraduationCap,
  LogIn,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { AuthInput } from './auth-input';
import { AuthFeedback } from './auth-feedback';
import { AuthSubmitButton, reveal } from './auth-submit-button';
import { useAuth } from './auth-provider';
import { UserRole, type LoginResponse } from '@placecampus/shared-types';
import { apiClient, ApiError } from '@/lib/api-client';
import { getDashboardRoute } from '@/lib/routes';
import { cn } from '@/lib/utils';
import styles from './auth-motion.module.css';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Username is required').email('Enter your username (your university email address)'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

const linkClass =
  'rounded-sm font-semibold text-[hsl(var(--color-primary-dark))] hover:text-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2';

/** Display order is fixed: three per row on wide screens. */
const ROLE_OPTIONS: { role: UserRole; label: string; icon: LucideIcon }[] = [
  { role: UserRole.STUDENT, label: 'Student', icon: GraduationCap },
  { role: UserRole.FACULTY, label: 'Faculty', icon: Users },
  { role: UserRole.ADMIN, label: 'Admin', icon: ShieldCheck },
  { role: UserRole.PLACEMENT_OFFICER, label: 'Placement Officer', icon: BriefcaseBusiness },
  { role: UserRole.PLACEMENT_HEAD, label: 'Placement Head', icon: ChartNoAxesColumnIncreasing },
  { role: UserRole.RECRUITER, label: 'Recruiter', icon: Building2 },
];

const roleLabel = (role: string) => ROLE_OPTIONS.find((o) => o.role === role)?.label ?? role;

const list = (labels: string[]) =>
  labels.length < 2 ? labels.join('') : `${labels.slice(0, -1).join(', ')} or ${labels.at(-1)}`;

/**
 * One sign-in page for every role. The selected role only picks the endpoint
 * and the session's role: the API decides which roles the account really has,
 * and a role the account doesn't hold is refused before any dashboard opens.
 */
export function LoginForm({ initialRole = UserRole.STUDENT }: { initialRole?: UserRole }) {
  const { setAuth, clearAuth } = useAuth();
  const router = useRouter();
  const [role, setRole] = React.useState<UserRole>(initialRole);
  const [serverError, setServerError] = React.useState<string | null>(null);
  // Keeps the button busy between a successful login and the dashboard route loading.
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginValues) => {
    setServerError(null);
    const isRecruiter = role === UserRole.RECRUITER;
    // Set once the API has issued a session, so a failed step can revoke it.
    let issued = false;
    try {
      const res = await apiClient.post<LoginResponse>(
        isRecruiter ? '/recruiter/auth/login' : '/auth/login',
        data,
      );
      issued = true;
      apiClient.setAccessToken(res.accessToken);

      const roles: string[] = res.roles?.length ? res.roles : [res.user.role];
      if (!roles.includes(role)) {
        await clearAuth();
        issued = false;
        setServerError(
          `This account doesn't have ${roleLabel(role)} access. Select ${list(roles.map(roleLabel))} and try again.`,
        );
        return;
      }

      setIsRedirecting(true);
      let token = res.accessToken;
      // Multi-role accounts: switch the new session to the role picked here.
      if (res.activeRole !== role) {
        token = (await apiClient.post<{ accessToken: string }>('/auth/active-role', { role })).accessToken;
      }
      await setAuth(token);
      router.replace(getDashboardRoute(role));
    } catch (error) {
      setIsRedirecting(false);
      if (issued) await clearAuth();
      if (error instanceof ApiError && error.status === 403 && !issued) {
        // The account exists but signs in through the other endpoint.
        setServerError(
          isRecruiter
            ? "This account doesn't have Recruiter access. Select your campus role and try again."
            : "This is a recruiter account. Select Recruiter and try again.",
        );
      } else if (error instanceof ApiError) {
        setServerError(error.message);
      } else if (error instanceof TypeError) {
        // fetch() rejects with a TypeError when the API can't be reached.
        setServerError('Cannot reach the server. Please check your connection or try again shortly.');
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    }
  };

  const busy = isSubmitting || isRedirecting;

  return (
    <div className="flex flex-col gap-5 [@media(max-height:780px)]:gap-4">
      <div className="flex flex-col gap-1.5 text-center">
        <h2 {...reveal(0, 'text-heading text-3xl font-bold tracking-tight')}>
          Welcome <span className="text-[hsl(var(--primary))]">Back!</span>
        </h2>
        <p {...reveal(1, 'text-body text-[15px] text-[hsl(var(--muted-foreground))]')}>
          Enter your credentials to access your account.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        aria-busy={busy}
        noValidate
      >
        <fieldset {...reveal(2, 'flex min-w-0 flex-col gap-2.5')} disabled={busy}>
          <legend className="mb-2.5 flex items-center gap-2 text-[15px] font-semibold text-[#10264A]">
            <Users className="h-[18px] w-[18px] text-[hsl(var(--primary))]" aria-hidden="true" />
            Select Your Role <span className="text-[hsl(var(--primary))]" aria-hidden="true">*</span>
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {ROLE_OPTIONS.map(({ role: value, label, icon: Icon }) => {
              const selected = value === role;
              return (
                <label
                  key={value}
                  className={cn(
                    'relative flex min-h-[52px] [@media(max-height:780px)]:min-h-[44px] min-w-0 cursor-pointer select-none items-center gap-2.5 rounded-xl border px-3 py-2 transition-[background-color,border-color,box-shadow,translate] duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[hsl(var(--ring))] has-[:focus-visible]:ring-offset-2 has-[:disabled]:cursor-not-allowed',
                    selected
                      ? 'border-[#FF6500] bg-[#FFF1E8] shadow-[0_8px_18px_-14px_rgba(255,101,0,0.9)]'
                      : 'border-[hsl(var(--border))] bg-white hover:-translate-y-px hover:border-[#FF6500]/50 hover:bg-[#FFF8F3]',
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    checked={selected}
                    onChange={() => {
                      setRole(value);
                      setServerError(null);
                    }}
                    className="sr-only"
                  />
                  <Icon
                    aria-hidden="true"
                    className={cn('h-5 w-5 shrink-0', selected ? 'text-[#FF6500]' : 'text-[#10264A]')}
                  />
                  <span className="min-w-0 flex-1 text-[13px] font-semibold leading-tight text-[#10264A] sm:text-sm">
                    {label}
                  </span>
                  {selected && (
                    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#FF6500]">
                      <Check className="h-3 w-3 text-white" strokeWidth={3} aria-hidden="true" />
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          <p className="rounded-lg bg-[#FFF1E8] px-3 py-1.5 [@media(max-height:780px)]:py-1 text-[13px] text-[hsl(var(--muted-foreground))]" aria-live="polite">
            Selected Role: <span className="font-semibold text-[#FF6500]">{roleLabel(role)}</span>
          </p>
        </fieldset>

        <AuthFeedback message={serverError} variant="banner" className="-mb-4 data-[open=true]:mb-0" />

        <AuthInput
          label="Username"
          type="text"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="name@university.edu"
          autoComplete="username"
          revealIndex={3}
          error={errors.email?.message}
          {...register('email')}
        />
        <AuthInput
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          revealIndex={4}
          error={errors.password?.message}
          {...register('password')}
        />

        <div {...reveal(5, 'mt-1 flex items-center justify-between gap-3')}>
          <label className="group inline-flex cursor-pointer select-none items-center gap-2.5 text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]">
            <span className="relative inline-flex h-[18px] w-[18px] shrink-0">
              <input
                type="checkbox"
                className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-[5px] border border-[hsl(var(--input))] bg-[hsl(var(--background))] transition-[background-color,border-color,box-shadow] duration-200 checked:border-[hsl(var(--primary))] checked:bg-[hsl(var(--primary))] group-hover:border-[hsl(var(--primary)/0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2"
              />
              <Check
                aria-hidden="true"
                strokeWidth={3}
                className="pointer-events-none absolute inset-0 m-auto h-3 w-3 scale-50 text-white opacity-0 transition-[opacity,scale] duration-200 ease-out peer-checked:scale-100 peer-checked:opacity-100"
              />
            </span>
            Remember me
          </label>
          <Link href="/forgot-password" className={cn('text-sm font-medium', linkClass, styles.linkUnderline)}>
            Forgot password?
          </Link>
        </div>

        <AuthSubmitButton busy={busy} busyLabel={isRedirecting ? 'Redirecting…' : 'Signing in…'} revealIndex={6}>
          <LogIn className="h-5 w-5" aria-hidden="true" />
          Sign In as {roleLabel(role)}
        </AuthSubmitButton>
      </form>
    </div>
  );
}
