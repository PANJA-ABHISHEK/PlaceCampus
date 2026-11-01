import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}

const sizeConfig = {
  sm: { icon: "h-7 w-7", text: "text-lg" },
  md: { icon: "h-9 w-9", text: "text-xl" },
  lg: { icon: "h-12 w-12", text: "text-2xl" },
};

/**
 * PlaceCampus Logo Component
 *
 * Renders the brand mark + optional wordmark.
 * Currently uses a styled SVG placeholder — replace with final
 * logo asset when available without rewriting the component API.
 */
export function Logo({
  className,
  size = "md",
  showWordmark = true,
}: LogoProps) {
  const config = sizeConfig[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* Brand Mark — replace SVG with final asset */}
      <div
        className={cn(
          "flex items-center justify-center rounded-[var(--radius-lg)] gradient-primary",
          config.icon,
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-[60%] w-[60%]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" fillOpacity="0.9" />
          <path
            d="M2 17l10 5 10-5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.7"
          />
          <path
            d="M2 12l10 5 10-5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.85"
          />
        </svg>
      </div>

      {/* Wordmark */}
      {showWordmark && (
        <span
          className={cn("font-bold tracking-tight", config.text)}
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span className="text-[hsl(var(--foreground))]">Place</span>
          <span className="text-[hsl(var(--primary))]">Campus</span>
        </span>
      )}
    </div>
  );
}
