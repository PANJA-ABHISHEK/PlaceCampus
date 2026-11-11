'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CAMPUS_LOGIN_ROUTE, RECRUITER_LOGIN_ROUTE, RECRUITER_REGISTER_ROUTE } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { AuthStudentPanel } from './auth-student-panel';
import styles from './auth-motion.module.css';

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Shared full-screen shell for the (auth) route group: the animated student on
 * the left half, the form centred on the right half. The page fits 100dvh and
 * never scrolls on desktop; below `lg` only the form is shown.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  const pathname = usePathname();
  // Login and recruiter sign-up use the compact brand lockup inside a wider card,
  // with no entrance or hover motion so the controls stay put.
  const isStatic =
    pathname === CAMPUS_LOGIN_ROUTE || pathname === RECRUITER_LOGIN_ROUTE || pathname === RECRUITER_REGISTER_ROUTE;

  return (
    <div
      className={cn(
        'h-dvh overflow-hidden bg-[hsl(var(--background))] lg:grid lg:grid-cols-2',
        styles.theme,
      )}
    >
      <aside className={cn('relative isolate hidden overflow-hidden lg:block', styles.panelEnter)}>
        <AuthStudentPanel />
      </aside>

      <div className="relative isolate flex h-full min-w-0 overflow-y-auto bg-[hsl(var(--background))] px-5 sm:px-10 lg:px-12 xl:px-16">
        {/* Soft warm glow and dot texture behind the card. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[hsl(var(--primary)/0.10)] blur-3xl" />
          <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-[hsl(var(--primary)/0.07)] blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--primary)/0.10)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,transparent_35%,black)]" />
        </div>

        <div
          className={cn(
            'm-auto flex w-full flex-col items-center py-6 sm:py-8 [@media(max-height:780px)]:py-2',
            isStatic ? 'max-w-[36.5rem]' : 'max-w-[30rem]',
          )}
        >
          {!isStatic && (
            <Link
              href="/"
              aria-label="PlaceCampus home"
              className="mb-7 block w-fit rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
            >
              <Image
                src="/images/placecampus-logo-trimmed.png"
                alt="PlaceCampus"
                width={1200}
                height={269}
                priority
                className="h-11 w-auto object-contain sm:h-12 xl:h-14"
              />
            </Link>
          )}
          <div className={cn('w-full rounded-[1.65rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_24px_60px_-28px_rgba(255,107,26,0.35),0_8px_24px_-12px_rgba(11,31,68,0.10)] sm:p-8 [@media(max-height:780px)]:p-5', isStatic && styles.staticForm)}>
            {isStatic && (
              <Link
                href="/"
                aria-label="PlaceCampus home"
                className="mx-auto mb-3 block w-fit rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] [@media(max-height:780px)]:mb-2"
              >
                <Image
                  src="/images/placecampus-logo-trimmed.png"
                  alt="PlaceCampus"
                  width={1200}
                  height={269}
                  priority
                  className="h-11 w-auto object-contain sm:h-[3.15rem] [@media(max-height:780px)]:h-9"
                />
              </Link>
            )}
            <div key={pathname} className={cn('auth-form-content flex flex-col', isStatic ? 'gap-4 sm:gap-5 [@media(max-height:780px)]:gap-3' : 'gap-7', styles.formEnter)}>
              {children}
            </div>
          </div>
          <p className="mt-5 text-center text-xs text-[hsl(var(--muted-foreground))]">
            © {new Date().getFullYear()} PlaceCampus ·{' '}
            <Link href="/" className="font-medium hover:text-[hsl(var(--primary))]">
              Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
