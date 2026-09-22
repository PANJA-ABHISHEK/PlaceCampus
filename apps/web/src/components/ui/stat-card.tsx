import { cn } from '@/lib/utils';

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: string; positive: boolean };
  className?: string;
}) {
  return (
    <div className={cn('card p-6', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[var(--color-muted)]">{title}</p>
          <p className="text-2xl font-bold text-[var(--color-foreground)]">{value}</p>
          {subtitle && (
            <p className="text-xs text-[var(--color-muted)]">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                'text-xs font-medium',
                trend.positive ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]',
              )}
            >
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-[var(--color-info-bg)] flex items-center justify-center text-[var(--color-primary)]">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
