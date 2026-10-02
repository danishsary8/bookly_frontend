import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * MASTER §6.11: --surface-2 block with the highlight sweep (static under reduced
 * motion). Decorative: wrap groups in <SkeletonGroup label="Loading …"> so screen
 * readers hear one busy message instead of nothing.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" aria-hidden="true" className={cn("skeleton rounded-sm", className)} {...props} />
}

function SkeletonGroup({ label, className, children, ...props }: React.ComponentProps<"div"> & { label: string }) {
  return (
    <div aria-busy="true" className={className} {...props}>
      <span className="sr-only" role="status">
        {label}
      </span>
      {children}
    </div>
  )
}

/** A list row: thumbnail + two lines (cart lines, live-search results, order rows). */
function SkeletonRow({ thumb = "cover", className }: { thumb?: "cover" | "circle" | "none"; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {thumb === "cover" ? <Skeleton className="h-[72px] w-12 shrink-0" /> : null}
      {thumb === "circle" ? <Skeleton className="size-10 shrink-0 rounded-full" /> : null}
      <div className="grid flex-1 gap-2">
        <Skeleton className="h-4 w-[70%]" />
        <Skeleton className="h-3.5 w-[40%]" />
      </div>
    </div>
  )
}

export { Skeleton, SkeletonGroup, SkeletonRow }
