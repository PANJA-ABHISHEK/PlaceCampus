import { FileQuestion } from 'lucide-react';

export function EmptyState({
  title = 'No data found',
  description = 'There is nothing to display here yet.',
  icon,
  action,
}: {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] flex items-center justify-center mb-4">
        {icon ?? <FileQuestion size={28} className="text-[var(--color-muted)]" />}
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-1">
        {title}
      </h3>
      <p className="text-sm text-[var(--color-muted)] max-w-sm mb-6">
        {description}
      </p>
      {action}
    </div>
  );
}
