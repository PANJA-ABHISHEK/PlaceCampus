import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const statusVariantMap: Record<string, BadgeVariant> = {
  UPLOADED: 'info',
  PROCESSING: 'warning',
  VERIFIED: 'success',
  APPROVED: 'success',
  REJECTED: 'danger',
  NEEDS_REVIEW: 'warning',
  PENDING: 'warning',
  RESUBMISSION_REQUESTED: 'warning',
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  DRAFT: 'neutral',
  PUBLISHED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

export function StatusBadge({
  status,
  variant,
  className,
}: {
  status: string;
  variant?: BadgeVariant;
  className?: string;
}) {
  const v = variant ?? statusVariantMap[status] ?? 'neutral';
  return (
    <span className={cn('badge', `badge-${v}`, className)}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
