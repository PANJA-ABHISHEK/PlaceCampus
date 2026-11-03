'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import styles from './auth-motion.module.css';

/** Props for an element taking part in the staggered auth form entrance. */
export function reveal(index: number, className?: string) {
  return {
    className: cn(styles.reveal, className),
    style: { '--auth-i': index } as React.CSSProperties,
  };
}

interface AuthSubmitButtonProps {
  busy: boolean;
  busyLabel: string;
  children: React.ReactNode;
  revealIndex: number;
}

export function AuthSubmitButton({ busy, busyLabel, children, revealIndex }: AuthSubmitButtonProps) {
  const { className, style } = reveal(revealIndex);

  return (
    <div className={className} style={style}>
      <Button
        type="submit"
        className="mt-2 h-12 w-full text-[0.95rem] font-semibold transition-[translate,scale,box-shadow,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-12px_hsl(var(--primary)/0.75)] active:translate-y-0 active:scale-[0.98] active:shadow-[var(--shadow-sm)] disabled:opacity-80"
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
        ) : null}
        {busy ? busyLabel : children}
      </Button>
    </div>
  );
}
