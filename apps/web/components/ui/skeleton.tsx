import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius-md)] bg-[hsl(var(--muted))]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
