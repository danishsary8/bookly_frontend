import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * MASTER §6.3 chip frame: 24px (md 28px), radius 4, 12px caps, +0.12em, a leading
 * icon and written text. Tone sets the colour, `shape` the form, so a status is
 * never told by colour alone (tint / solid / dashed outline).
 * Book-specific badges (Sale, New, stock) live in components/BookBadge.tsx.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-bold uppercase leading-none tracking-[0.12em] [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "",
        info: "",
        success: "",
        warning: "",
        danger: "",
      },
      shape: {
        tint: "",
        solid: "",
        outline: "border-[1.5px] border-dashed bg-transparent",
      },
      size: {
        sm: "h-6",
        md: "h-7 px-2.5",
      },
    },
    compoundVariants: [
      { shape: "tint", tone: "neutral", className: "bg-surface-2 text-muted-foreground" },
      { shape: "tint", tone: "info", className: "bg-lapis-tint text-primary" },
      { shape: "tint", tone: "success", className: "bg-success-tint text-success" },
      { shape: "tint", tone: "warning", className: "bg-warning-tint text-warning" },
      { shape: "tint", tone: "danger", className: "bg-destructive-tint text-destructive" },
      { shape: "solid", tone: "neutral", className: "bg-foreground text-background" },
      { shape: "solid", tone: "info", className: "bg-primary text-primary-foreground" },
      { shape: "solid", tone: "success", className: "bg-success text-success-foreground" },
      { shape: "solid", tone: "warning", className: "bg-warning text-background" },
      { shape: "solid", tone: "danger", className: "bg-destructive text-background" },
      { shape: "outline", tone: "neutral", className: "border-muted-foreground text-muted-foreground" },
      { shape: "outline", tone: "info", className: "border-primary text-primary" },
      { shape: "outline", tone: "success", className: "border-success text-success" },
      { shape: "outline", tone: "warning", className: "border-warning text-warning" },
      { shape: "outline", tone: "danger", className: "border-destructive text-destructive" },
    ],
    defaultVariants: { tone: "neutral", shape: "tint", size: "sm" },
  },
)

type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>

function Badge({ className, tone, shape, size, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone, shape, size }), className)} {...props} />
}

/** Small numeric count, e.g. on the header cart button. Vermilion with ink text (MASTER §6.10). */
function CountBadge({ count, max = 99, className, ...props }: React.ComponentProps<"span"> & { count: number; max?: number }) {
  if (count <= 0) return null
  return (
    <span
      data-slot="count-badge"
      className={cn(
        "inline-grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold tabular-nums leading-none text-accent-foreground",
        className,
      )}
      {...props}
    >
      {count > max ? `${max}+` : count}
    </span>
  )
}

export { Badge, CountBadge, badgeVariants, type BadgeProps }
