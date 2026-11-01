import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  text?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function LoadingState({
  text = "Loading...",
  className,
  size = "md",
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4",
        className,
      )}
    >
      <Loader2
        className={cn(
          "animate-spin text-[hsl(var(--primary))] mb-3",
          sizeMap[size],
        )}
      />
      {text && (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">{text}</p>
      )}
    </div>
  );
}
