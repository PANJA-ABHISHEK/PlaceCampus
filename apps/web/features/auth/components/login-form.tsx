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
  LockKeyhole,
  Mail,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { AuthInput } from './auth-input';
import { AuthFeedback } from './auth-feedback';
import { AuthSubmitButton, reveal } from './auth-submit-button';
import { useAuth } from './auth-provider';
import type { LoginResponse } from '@placecampus/shared-types';
import { apiClient, ApiError } from '@/lib/api-client';
import { getPostLoginRoute } from '@/lib/routes';
import { cn } from '@/lib/utils';
import styles from './auth-motion.module.css';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Username is required').email('Enter your username (your email address)'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

const linkClass =
  'rounded-sm font-semibold text-[hsl(var(--color-primary-dark))] hover:text-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2';

type LoginRole = 'student' | 'faculty' | 'admin' | 'placement' | 'head' | 'recruiter';

const ROLES: { id: LoginRole; label: string; icon: LucideIcon }[] = [
  { id: 'student', label: 'Student', icon: GraduationCap },
  { id: 'faculty', label: 'Faculty', icon: Users },
  { id: 'admin', label: 'Admin', icon: ShieldCheck },
  { id: 'placement', label: 'Placement Officer', icon: BriefcaseBusiness },
  { id: 'head', label: 'Placement Head', icon: ChartNoAxesColumnIncreasing },
  { id: 'recruiter', label: 'Recruiter', icon: Building2 },
];

/**
 * Email and password only. The account's role comes from the API response,
 * never from anything the user picks or the URL.
 */
export function LoginForm({ portal = 'campus' }: { portal?: 'campus' | 'recruiter' }) {
  const { setAuth } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [selectedRole, setSelectedRole] = React.useState<LoginRole>(portal === 'recruiter' ? 'recruiter' : 'student');
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
    try {
      const endpoint = selectedRole === 'recruiter' ? '/recruiter/auth/login' : '/auth/login';
      const res = await apiClient.post<LoginResponse>(endpoint, data);
      setIsRedirecting(true);
      await setAuth(res.accessToken);
      router.replace(getPostLoginRoute(res));
    } catch (error) {
      setIsRedirecting(false);
      if (error instanceof ApiError) {
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
    <div className="flex flex-col gap-5 sm:gap-6 [@media(max-height:780px)]:gap-3.5">
      <div className="flex flex-col gap-2 text-center">
        <h2 {...reveal(0, 'text-heading text-[1.8rem] font-bold tracking-tight sm:text-[2rem]')}>
          Welcome <span className="text-[hsl(var(--primary))]">Back!</span>
        </h2>
        <p {...reveal(1, 'text-body text-sm text-[hsl(var(--muted-foreground))] sm:text-[15px]')}>
          Choose your role and sign in to continue.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-3.5 sm:gap-4 [@media(max-height:780px)]:gap-3"
        aria-busy={busy}
        noValidate
      >
        <AuthFeedback message={serverError} variant="banner" className="-mb-4 data-[open=true]:mb-0" />

        <fieldset {...reveal(2, 'min-w-0')}>
          <legend className="mb-2.5 text-sm font-semibold text-[hsl(var(--foreground))]">
            Sign in as <span className="text-[hsl(var(--primary))]">*</span>
          </legend>
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5" role="group" aria-label="Choose a sign-in role">
            {ROLES.map(({ id, label, icon: Icon }) => {
              const selected = selectedRole === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setSelectedRole(id);
                    setServerError(null);
                  }}
                  className={cn(
                    'relative flex min-h-[4.35rem] flex-col items-center justify-center gap-1 rounded-[1rem] border px-1.5 py-2 text-center transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 [@media(max-height:780px)]:min-h-[3.75rem]',
                    selected
                      ? 'border-[hsl(var(--primary))] bg-[#FFF4EC] text-[hsl(var(--color-primary-dark))] shadow-[0_5px_14px_-10px_rgba(255,107,26,0.8)]'
                      : 'border-[hsl(var(--border))] bg-white text-[hsl(var(--foreground))]',
                  )}
                >
                  <span className={cn('flex h-7 w-7 items-center justify-center rounded-full', selected ? 'bg-[hsl(var(--primary))] text-white' : 'bg-slate-50 text-[#263958]')}>
                    <Icon aria-hidden="true" className="h-[17px] w-[17px]" strokeWidth={2.1} />
                  </span>
                  <span className="text-[10px] font-semibold leading-tight sm:text-[12px]">{label}</span>
                  {selected && (
                    <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white">
                      <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>

        <AuthInput
          label="Username"
          type="text"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={selectedRole === 'recruiter' ? 'name@company.com' : 'name@university.edu'}
          autoComplete="username"
          leadingIcon={Mail}
          revealIndex={3}
          error={errors.email?.message}
          {...register('email')}
        />
        <AuthInput
          label="Password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          leadingIcon={LockKeyhole}
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
          <span className="inline-flex items-center justify-center gap-2">
            <LogIn aria-hidden="true" className="h-[17px] w-[17px]" />
            Sign In as {ROLES.find((role) => role.id === selectedRole)?.label}
          </span>
        </AuthSubmitButton>

        {selectedRole === 'recruiter' && (
          <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
            New recruiter?{' '}
            <Link href="/recruiter/register" className={cn(linkClass, styles.linkUnderline)}>
              Create a recruiter account
            </Link>
          </p>
        )}
      </form>

    </div>
  );
}
