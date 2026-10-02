import { AlertTriangle, RotateCcw, WifiOff } from "lucide-react"
import { Link } from "react-router-dom"

import { ApiError } from "@/api/errors"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/*
 * MASTER §6.22. `ErrorState` replaces a whole page or section whose data failed;
 * `InlineError` sits where one widget failed. Both read an ApiError (or anything
 * thrown) and offer a retry. Network failures get the offline wording.
 */

type ErrorStateProps = {
  error: unknown
  onRetry?: () => void
  title?: string
  headingLevel?: "h1" | "h2" | "h3"
  showHomeLink?: boolean
  className?: string
}

function ErrorState({ error, onRetry, title, headingLevel = "h2", showHomeLink = true, className }: ErrorStateProps) {
  const apiError = ApiError.from(error)
  const offline = apiError.kind === "network"
  const Icon = offline ? WifiOff : AlertTriangle
  const Heading = headingLevel

  return (
    <div role="alert" className={cn("mx-auto grid max-w-md justify-items-center gap-3 px-4 py-12 text-center", className)}>
      <div className="mb-2 grid size-24 place-items-center rounded-full bg-destructive-tint text-destructive">
        <Icon className="size-11" strokeWidth={1.5} aria-hidden="true" />
      </div>
      <Heading className="font-display text-[1.563rem] leading-tight text-foreground">
        {title ?? (offline ? "You're offline" : "Something went wrong")}
      </Heading>
      <p className="text-base text-muted-foreground">
        {offline ? "Check your connection, then try again." : apiError.message}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <Button onClick={onRetry}>
            <RotateCcw aria-hidden="true" /> Try again
          </Button>
        ) : null}
        {showHomeLink ? (
          <Link to="/" className={buttonVariants({ variant: "link" })}>
            Go home
          </Link>
        ) : null}
      </div>
      {apiError.requestId ? (
        <p className="mt-2 font-mono text-xs text-muted-foreground">Reference: {apiError.requestId}</p>
      ) : null}
    </div>
  )
}

function InlineError({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const apiError = ApiError.from(error)
  return (
    <div
      role="alert"
      className={cn("flex flex-wrap items-center gap-3 rounded-lg bg-destructive-tint px-4 py-3 text-sm text-destructive", className)}
    >
      <AlertTriangle className="size-[18px] shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 font-medium">{apiError.message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="border-current text-destructive hover:bg-card">
          Try again
        </Button>
      ) : null}
    </div>
  )
}

export { ErrorState, InlineError, type ErrorStateProps }
