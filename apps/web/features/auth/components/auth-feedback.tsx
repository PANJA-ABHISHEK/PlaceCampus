'use client';

import * as React from 'react';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from './auth-motion.module.css';

interface AuthFeedbackProps {
  message?: string | null;
  tone?: 'error' | 'success';
  variant?: 'inline' | 'banner';
  id?: string;
  className?: string;
  /** Announce politely even for errors (e.g. live typing feedback). */
  polite?: boolean;
}

/**
 * Animated feedback row for validation and server messages.
 *
 * Height and opacity transition on both show and hide; the last message stays
 * rendered while collapsing so it doesn't vanish abruptly. Screen readers get
 * the live message through a visually hidden span that only exists while open.
 */
export function AuthFeedback({
  message,
  tone = 'error',
  variant = 'inline',
  id,
  className,
  polite = false,
}: AuthFeedbackProps) {
  const [lastMessage, setLastMessage] = React.useState(message);
  if (message && message !== lastMessage) setLastMessage(message);

  const open = Boolean(message);
  const assertive = tone === 'error' && !polite;
  const Icon = tone === 'error' ? CircleAlert : CheckCircle2;

  return (
    <div className={cn(styles.collapse, className)} data-open={open}>
      <div>
        <p
          id={id}
          role={assertive ? 'alert' : 'status'}
          aria-live={assertive ? 'assertive' : 'polite'}
          className={cn(
            'flex items-start gap-1.5',
            variant === 'inline' && 'pt-1.5 text-xs font-medium',
            variant === 'banner' && 'rounded-lg border p-3 text-sm',
            tone === 'error' && variant === 'inline' && 'text-[hsl(var(--destructive))]',
            tone === 'success' && variant === 'inline' && 'text-[hsl(var(--color-success))]',
            tone === 'error' &&
              variant === 'banner' &&
              'border-red-500/20 bg-red-500/10 text-red-600',
            tone === 'success' &&
              variant === 'banner' &&
              'border-green-500/20 bg-green-500/10 text-green-700',
          )}
        >
          {open && <span className="sr-only">{message}</span>}
          <Icon
            aria-hidden="true"
            className={cn('shrink-0', variant === 'inline' ? 'mt-px h-3.5 w-3.5' : 'mt-0.5 h-4 w-4')}
          />
          <span aria-hidden="true">{lastMessage}</span>
        </p>
      </div>
    </div>
  );
}
