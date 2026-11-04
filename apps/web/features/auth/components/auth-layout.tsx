'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

        <div className="m-auto flex w-full max-w-[30rem] flex-col items-center py-8">
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
          <div className="w-full rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_24px_60px_-28px_rgba(255,107,26,0.35),0_8px_24px_-12px_rgba(11,31,68,0.10)] sm:p-8 xl:p-9">
            <div key={pathname} className={cn('auth-form-content flex flex-col gap-7', styles.formEnter)}>
              {children}
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
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
