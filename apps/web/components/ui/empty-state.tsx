import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title = "No data found",
  description = "There are no items to display at the moment.",
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        className,
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--muted))] mb-4">
        {icon || (
          <Inbox className="h-8 w-8 text-[hsl(var(--muted-foreground))]" />
        )}
      </div>
      <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-1">
        {title}
      </h3>
      <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-sm mb-4">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
