'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CAMPUS_LOGIN_ROUTE, RECRUITER_LOGIN_ROUTE } from '@/lib/routes';
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
  // The login card holds the role grid, so it is wider and spaced tighter to fit one screen.
  const isLogin = pathname === CAMPUS_LOGIN_ROUTE || pathname === RECRUITER_LOGIN_ROUTE;

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
            'm-auto flex w-full flex-col items-center',
            isLogin ? 'max-w-[35rem] py-5 [@media(max-height:780px)]:py-3' : 'max-w-[30rem] py-8',
          )}
        >
          <div
            className={cn(
              // The logo pair sits a little left of centre, as requested.
              'flex -translate-x-5 items-center justify-center gap-4 sm:-translate-x-12 sm:gap-7',
              isLogin ? 'mb-4 [@media(max-height:780px)]:mb-2' : 'mb-7',
            )}
          >
            {isLogin && (
              <Image
                src="/images/lpu-logo.png"
                alt="Lovely Professional University Logo"
                width={554}
                height={554}
                priority
                // The logo is circular on a white square; rounding only trims those corners.
                className="h-12 w-12 shrink-0 rounded-full object-contain sm:h-14 sm:w-14 xl:h-[70px] xl:w-[70px] [@media(max-height:780px)]:h-14 [@media(max-height:780px)]:w-14"
              />
            )}
            <Link
              href="/"
              aria-label="PlaceCampus home"
              className="block w-fit rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
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
          </div>
          <div
            className={cn(
              'w-full rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_24px_60px_-28px_rgba(255,107,26,0.35),0_8px_24px_-12px_rgba(11,31,68,0.10)]',
              isLogin ? 'p-5 sm:p-7 xl:px-8 xl:py-7 [@media(max-height:780px)]:sm:py-5' : 'p-6 sm:p-8 xl:p-9',
            )}
          >
            <div key={pathname} className={cn('auth-form-content flex flex-col gap-7', styles.formEnter)}>
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
