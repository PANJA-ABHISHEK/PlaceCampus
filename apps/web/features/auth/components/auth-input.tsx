'use client';

import * as React from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { AuthFeedback } from './auth-feedback';
import styles from './auth-motion.module.css';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Shows a success border (e.g. confirmed password matches). */
  success?: boolean;
  leadingIcon?: LucideIcon;
  /** Position in the staggered form entrance; omit to skip the entrance. */
  revealIndex?: number;
}

export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, success, revealIndex, leadingIcon: LeadingIcon, className, type, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = props.id ?? generatedId;
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === 'password';
    const errorId = `${inputId}-error`;
    const describedBy = [props['aria-describedby'], error ? errorId : null]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        className={cn('auth-field group space-y-2', revealIndex !== undefined && styles.reveal)}
        style={
          revealIndex !== undefined
            ? ({ '--auth-i': revealIndex } as React.CSSProperties)
            : undefined
        }
      >
        <Label
          htmlFor={inputId}
          className={cn(
            'transition-colors duration-200',
            error
              ? 'text-destructive'
              : 'group-focus-within:text-[hsl(var(--color-primary-dark))]',
          )}
        >
          {label}
        </Label>
        <div className="relative">
          <Input
            id={inputId}
            type={isPassword && showPassword ? 'text' : type}
            className={cn(
              'h-11 bg-[hsl(var(--background))] transition-[border-color,box-shadow,background-color] duration-200 hover:border-[hsl(var(--primary)/0.45)] focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/0.14)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[hsl(var(--primary)/0.14)]',
              success &&
                !error &&
                'border-[hsl(var(--color-success)/0.6)] hover:border-[hsl(var(--color-success)/0.8)]',
              error &&
                'border-destructive hover:border-destructive focus:border-destructive focus:ring-[hsl(var(--destructive)/0.14)] focus-visible:ring-[hsl(var(--destructive)/0.14)]',
              LeadingIcon && 'pl-11',
              isPassword && 'pr-12',
              className,
            )}
            ref={ref}
            {...props}
            aria-invalid={error ? true : props['aria-invalid']}
            aria-describedby={describedBy || undefined}
          />
          {LeadingIcon && (
            <LeadingIcon
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
            />
          )}
          {isPassword && (
            <button
              type="button"
              aria-label={showPassword ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
              aria-pressed={showPassword}
              aria-controls={inputId}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-[hsl(var(--muted))] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              onClick={() => setShowPassword((visible) => !visible)}
            >
              <Eye
                aria-hidden="true"
                className={cn(
                  'absolute h-4 w-4 transition-[opacity,rotate,scale] duration-200 ease-out',
                  showPassword ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100',
                )}
              />
              <EyeOff
                aria-hidden="true"
                className={cn(
                  'absolute h-4 w-4 transition-[opacity,rotate,scale] duration-200 ease-out',
                  showPassword ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0',
                )}
              />
            </button>
          )}
        </div>
        <AuthFeedback id={errorId} message={error} className="!mt-0" />
      </div>
    );
  },
);
AuthInput.displayName = 'AuthInput';
