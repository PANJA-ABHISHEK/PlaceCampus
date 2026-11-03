'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Check, CheckCircle2, Circle } from 'lucide-react';
import { AuthInput } from './auth-input';
import { AuthFeedback } from './auth-feedback';
import { AuthSubmitButton, reveal } from './auth-submit-button';
import { Button } from '@/components/ui/button';
import { apiClient, ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import styles from './auth-motion.module.css';

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterValues = z.infer<typeof registerSchema>;

const STRENGTH_LEVELS = [
  { label: 'Weak', bar: 'bg-[hsl(var(--color-error))]', text: 'text-[hsl(var(--color-error))]' },
  { label: 'Weak', bar: 'bg-[hsl(var(--color-error))]', text: 'text-[hsl(var(--color-error))]' },
  { label: 'Good', bar: 'bg-amber-500', text: 'text-amber-600' },
  { label: 'Good', bar: 'bg-[hsl(var(--primary))]', text: 'text-[hsl(var(--color-primary-dark))]' },
  { label: 'Strong', bar: 'bg-[hsl(var(--color-success))]', text: 'text-[hsl(var(--color-success))]' },
] as const;

const linkClass =
  'rounded-sm font-semibold text-[hsl(var(--color-primary-dark))] hover:text-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2';

export function RegisterForm() {
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = useWatch({ control, name: 'password' }) ?? '';
  const confirmPasswordValue = useWatch({ control, name: 'confirmPassword' }) ?? '';
  const passwordsMatch = Boolean(confirmPasswordValue) && passwordValue === confirmPasswordValue;

  const calculateStrength = (pass: string) => {
    if (!pass) return 0;
    let strength = 0;
    if (pass.length > 7) strength += 25;
    if (pass.match(/[a-z]+/)) strength += 25;
    if (pass.match(/[A-Z]+/)) strength += 25;
    if (pass.match(/[0-9!@#$%^&*]+/)) strength += 25;
    return strength;
  };

  const strength = calculateStrength(passwordValue);
  const filledSegments = strength / 25;
  const level = STRENGTH_LEVELS[filledSegments];
  const meetsMinLength = passwordValue.length >= 8;

  const onSubmit = async (data: RegisterValues) => {
    setServerError(null);
    try {
      await apiClient.post('/auth/register', {
        fullName: data.fullName,
        email: data.email,
        password: data.password,
      });
      setIsSuccess(true);
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
      } else if (error instanceof TypeError) {
        setServerError(
          'Could not reach the PlaceCampus API. Check that the API server and its database are running, then try again.',
        );
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    }
  };

  if (isSuccess) {
    return (
      <div
        role="status"
        className={cn('flex flex-col items-center justify-center gap-4 py-8 text-center', styles.feedback)}
      >
        <div
          className={cn(
            'mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100',
            styles.successIcon,
          )}
        >
          <CheckCircle2 aria-hidden="true" className="h-8 w-8 text-green-600" />
        </div>
        <h2 {...reveal(1, 'text-heading text-2xl font-bold')}>Account created</h2>
        <p {...reveal(2, 'text-body text-sm text-[hsl(var(--muted-foreground))]')}>
          Your account has been successfully created. You can now log in to the platform.
        </p>
        <div {...reveal(3, 'mt-4 w-full')}>
          <Button
            asChild
            className="h-12 w-full font-semibold transition-[translate,scale,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-12px_hsl(var(--primary)/0.75)] active:translate-y-0 active:scale-[0.98]"
          >
            <Link href="/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 {...reveal(0, 'text-heading text-3xl font-bold tracking-tight')}>Create account</h2>
        <p {...reveal(1, 'text-body text-sm text-[hsl(var(--muted-foreground))]')}>
          Join PlaceCampus to track readiness and opportunities.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        aria-busy={isSubmitting}
        noValidate
      >
        <AuthFeedback message={serverError} variant="banner" className="-mb-4 data-[open=true]:mb-0" />

        <AuthInput
          label="Full Name"
          type="text"
          placeholder="Jane Doe"
          autoComplete="name"
          revealIndex={2}
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <AuthInput
          label="Email address"
          type="email"
          placeholder="name@university.edu"
          autoComplete="email"
          revealIndex={3}
          error={errors.email?.message}
          {...register('email')}
        />

        <div>
          <AuthInput
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            revealIndex={4}
            aria-describedby="password-strength"
            error={errors.password?.message}
            {...register('password')}
          />
          <div id="password-strength" className={styles.collapse} data-open={Boolean(passwordValue)}>
            <div>
              <div className="flex flex-col gap-1.5 pt-2.5">
                <div className="flex gap-1.5" aria-hidden="true">
                  {[0, 1, 2, 3].map((segment) => (
                    <span
                      key={segment}
                      className="h-1 flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]"
                    >
                      <span
                        className={cn(
                          'block h-full origin-left rounded-full transition-[scale,background-color] duration-300 ease-out',
                          level.bar,
                          segment < filledSegments ? 'scale-x-100' : 'scale-x-0',
                        )}
                      />
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 transition-colors duration-200',
                      meetsMinLength
                        ? 'text-[hsl(var(--color-success))]'
                        : 'text-[hsl(var(--muted-foreground))]',
                    )}
                  >
                    {meetsMinLength ? (
                      <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
                    ) : (
                      <Circle aria-hidden="true" className="h-3 w-3" />
                    )}
                    At least 8 characters
                  </span>
                  <span className={cn('font-semibold transition-colors duration-200', level.text)} aria-live="polite">
                    <span className="sr-only">Password strength: </span>
                    {passwordValue ? level.label : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <AuthInput
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            revealIndex={5}
            success={passwordsMatch}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <AuthFeedback
            tone={passwordsMatch ? 'success' : 'error'}
            polite
            message={
              confirmPasswordValue && !errors.confirmPassword
                ? passwordsMatch
                  ? 'Passwords match'
                  : 'Passwords don’t match yet'
                : null
            }
          />
        </div>

        <AuthSubmitButton busy={isSubmitting} busyLabel="Creating account…" revealIndex={6}>
          Create Account
        </AuthSubmitButton>
      </form>

      <div {...reveal(7, 'mt-2 text-center text-sm text-[hsl(var(--muted-foreground))]')}>
        Already have an account?{' '}
        <Link href="/login" className={cn(linkClass, styles.linkUnderline)}>
          Sign In
        </Link>
      </div>
    </div>
  );
}
