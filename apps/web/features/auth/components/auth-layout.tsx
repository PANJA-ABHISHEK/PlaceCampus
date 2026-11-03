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

      <div className="flex h-full min-w-0 overflow-y-auto bg-[hsl(var(--background))] px-5 sm:px-10 lg:overflow-y-hidden lg:px-14 xl:px-20">
        <div className="m-auto w-full max-w-[28rem] py-8">
          <Link
            href="/"
            aria-label="PlaceCampus home"
            className="mb-8 block w-fit rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] lg:mb-10"
          >
            <Image
              src="/images/placecampus-logo.png"
              alt="PlaceCampus"
              width={2137}
              height={736}
              priority
              className="h-auto w-[160px] object-contain sm:w-[176px]"
            />
          </Link>
          <div key={pathname} className={cn('auth-form-content flex flex-col gap-7', styles.formEnter)}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
