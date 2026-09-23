import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary-light",
        secondary:
          "border-transparent bg-surface text-foreground hover:bg-surface-hover",
        destructive:
          "border-transparent bg-danger text-white hover:bg-danger/80",
        outline: "text-foreground border-border",
        success: "border-transparent bg-success-bg text-success hover:bg-success-bg/80",
        warning: "border-transparent bg-warning-bg text-warning hover:bg-warning-bg/80",
        info: "border-transparent bg-info-bg text-info hover:bg-info-bg/80",
        accent: "border-transparent bg-accent text-accent-foreground hover:bg-accent-light"
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
