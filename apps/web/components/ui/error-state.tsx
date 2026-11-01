import { AlertTriangle } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        className,
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--color-error-light))] mb-4">
        <AlertTriangle className="h-8 w-8 text-[hsl(var(--color-error))]" />
      </div>
      <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-1">
        {title}
      </h3>
      <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-sm mb-4">
        {description}
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
