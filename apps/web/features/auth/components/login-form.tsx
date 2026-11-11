'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Check } from 'lucide-react';
import { AuthInput } from './auth-input';
import { AuthFeedback } from './auth-feedback';
import { AuthSubmitButton, reveal } from './auth-submit-button';
import { useAuth } from './auth-provider';
import type { LoginResponse } from '@placecampus/shared-types';
import { apiClient, ApiError } from '@/lib/api-client';
import { CAMPUS_LOGIN_ROUTE, RECRUITER_LOGIN_ROUTE, getPostLoginRoute } from '@/lib/routes';
import { cn } from '@/lib/utils';
import styles from './auth-motion.module.css';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Username is required').email('Enter your username (your university email address)'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

const linkClass =
  'rounded-sm font-semibold text-[hsl(var(--color-primary-dark))] hover:text-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2';

const PORTALS = {
  campus: { endpoint: '/auth/login', subtitle: 'Enter your credentials to access your account.' },
  recruiter: { endpoint: '/recruiter/auth/login', subtitle: 'Sign in with your recruiter account to review shared candidates.' },
} as const;

/**
 * Email and password only. The account's role comes from the API response,
 * never from anything the user picks or the URL.
 */
export function LoginForm({ portal = 'campus' }: { portal?: keyof typeof PORTALS }) {
  const { setAuth } = useAuth();
  const router = useRouter();
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
    try {
      const res = await apiClient.post<LoginResponse>(PORTALS[portal].endpoint, data);
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h2 {...reveal(0, 'text-heading text-3xl font-bold tracking-tight')}>
          Welcome <span className="text-[hsl(var(--primary))]">Back!</span>
        </h2>
        <p {...reveal(1, 'text-body text-[15px] text-[hsl(var(--muted-foreground))]')}>
          {PORTALS[portal].subtitle}
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        aria-busy={busy}
        noValidate
      >
        <AuthFeedback message={serverError} variant="banner" className="-mb-4 data-[open=true]:mb-0" />

        <AuthInput
          label="Username"
          type="text"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="name@university.edu"
          autoComplete="username"
          revealIndex={2}
          error={errors.email?.message}
          {...register('email')}
        />
        <AuthInput
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          revealIndex={3}
          error={errors.password?.message}
          {...register('password')}
        />

        <div {...reveal(4, 'mt-1 flex items-center justify-between gap-3')}>
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

        <AuthSubmitButton busy={busy} busyLabel={isRedirecting ? 'Redirecting…' : 'Signing in…'} revealIndex={5}>
          Sign In
        </AuthSubmitButton>
      </form>

      <div {...reveal(6, 'border-t border-[hsl(var(--border))] pt-5 text-center text-sm text-[hsl(var(--muted-foreground))]')}>
        {portal === 'campus' ? (
          <>
            Recruiter?{' '}
            <Link href={RECRUITER_LOGIN_ROUTE} className={cn(linkClass, styles.linkUnderline)}>
              Sign in as Recruiter
            </Link>
          </>
        ) : (
          <>
            Student or university staff?{' '}
            <Link href={CAMPUS_LOGIN_ROUTE} className={cn(linkClass, styles.linkUnderline)}>
              Campus sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
