import { ChevronLeft, ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"

import { buttonVariants } from "@/components/ui/button"
import { pageRange } from "@/lib/pagination"
import { cn } from "@/lib/utils"
import { useT } from "@/i18n"

/*
 * MASTER §6.8. Give `hrefFor` for URL-synced lists (real links: shareable, work
 * without JS state), or `onPageChange` for in-page lists. Below 640px only
 * Prev · "Page 3 of 12" · Next is shown.
 */
type PaginationProps = {
  page: number
  lastPage: number
  hrefFor?: (page: number) => string
  onPageChange?: (page: number) => void
  className?: string
}

function Pagination({ page, lastPage, hrefFor, onPageChange, className }: PaginationProps) {
  const { dict } = useT()
  if (lastPage <= 1) return null

  const item = (target: number, content: React.ReactNode, opts: { label: string; className: string; current?: boolean; disabled?: boolean }) => {
    const common = {
      "aria-label": opts.label,
      "aria-current": opts.current ? ("page" as const) : undefined,
      className: opts.className,
    }
    if (opts.disabled) {
      return (
        <span {...common} aria-disabled="true" className={cn(opts.className, "pointer-events-none opacity-40")}>
          {content}
        </span>
      )
    }
    if (hrefFor) {
      return (
        <Link to={hrefFor(target)} {...common}>
          {content}
        </Link>
      )
    }
    return (
      <button type="button" onClick={() => onPageChange?.(target)} {...common}>
        {content}
      </button>
    )
  }

  const step = cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1 px-3")
  const number = (current: boolean) =>
    cn(buttonVariants({ variant: current ? "default" : "ghost", size: "icon" }), "tabular-nums text-[15px]")

  return (
    <nav aria-label={dict.ui.pagination} className={cn("flex items-center justify-center gap-2", className)}>
      {item(page - 1, <><ChevronLeft aria-hidden="true" /> {dict.ui.prev}</>, { label: dict.ui.previousPage, className: step, disabled: page <= 1 })}

      <ol className="hidden items-center gap-1 sm:flex">
        {pageRange(page, lastPage).map((entry) =>
          typeof entry === "number" ? (
            <li key={entry}>
              {item(entry, entry, { label: dict.ui.page(entry), className: number(entry === page), current: entry === page })}
            </li>
          ) : (
            <li key={entry} aria-hidden="true" className="grid size-11 place-items-center text-muted-foreground">
              …
            </li>
          ),
        )}
      </ol>
      <p className="px-2 text-sm font-medium tabular-nums text-muted-foreground sm:hidden">
        {dict.ui.pageOf(page, lastPage)}
      </p>

      {item(page + 1, <>{dict.ui.next} <ChevronRight aria-hidden="true" /></>, { label: dict.ui.nextPage, className: step, disabled: page >= lastPage })}
    </nav>
  )
}

export { Pagination, type PaginationProps }
