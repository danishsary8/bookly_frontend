import type { ReactNode } from "react";
import { AlertCircle, Link2Off, Loader2, RotateCw } from "lucide-react";
import { Link } from "react-router-dom";
import { Seal } from "@/components/shopping/Seal";
import { Button, buttonVariants } from "@/components/ui/button";
import type { EmailLinkState } from "@/features/content/useEmailLink";
import { useT } from "@/i18n";

type Action = { to: string; label: string };

/*
 * One centred sheet on the warm paper for the "a link from an email did something" pages (pages/content.md):
 * newsletter confirm / unsubscribe, stop cart reminders. Icon disc (spinner; the Seal that draws its check; a
 * broken link for an expired or wrong link; an alert for a failure), a Gloock title, one sentence, then one main
 * action (success: the next step, vermilion; failure: Try again) and one quiet link.
 */
export function StatusPanel({
  state,
  title,
  children,
  primary,
  quiet,
  onRetry,
}: {
  state: EmailLinkState;
  title: ReactNode;
  children?: ReactNode;
  /** The next step after success, or how to fix an expired link. */
  primary?: Action;
  quiet?: Action;
  onRetry?: () => void;
}) {
  const { dict } = useT();
  const disc = {
    loading: (
      <span className="grid size-16 place-items-center rounded-full bg-lapis-tint text-primary">
        <Loader2 className="size-7 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      </span>
    ),
    success: <Seal />,
    invalid: (
      <span className="grid size-16 place-items-center rounded-full bg-warning-tint text-warning">
        <Link2Off className="size-7" strokeWidth={1.75} aria-hidden="true" />
      </span>
    ),
    error: (
      <span className="grid size-16 place-items-center rounded-full bg-destructive-tint text-destructive">
        <AlertCircle className="size-8" strokeWidth={1.75} aria-hidden="true" />
      </span>
    ),
  }[state];

  return (
    <div className="container-shell flex min-h-[62vh] items-center justify-center py-16 short:py-10">
      <div aria-live="polite" aria-busy={state === "loading"} className="shop-card relative isolate grid w-full max-w-lg justify-items-center gap-4 overflow-hidden rounded-3xl border border-border bg-card px-6 py-12 text-center sm:px-12">
        <span className="pointer-events-none absolute -top-24 left-1/2 -z-10 size-72 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--primary)_9%,transparent),transparent)]" aria-hidden="true" />
        {disc}
        <h1 className="text-balance font-display text-[2rem] leading-tight">{title}</h1>
        {children ? <div className="max-w-sm text-[15px] leading-relaxed text-muted-foreground">{children}</div> : null}
        {state !== "loading" ? (
          <div className="mt-3 grid justify-items-center gap-2">
            {state === "error" && onRetry ? (
              <Button onClick={onRetry}>
                <RotateCw aria-hidden="true" /> {dict.emailLink.retry}
              </Button>
            ) : primary ? (
              <Link to={primary.to} className={buttonVariants({ variant: state === "success" ? "cta" : "default" })}>
                {primary.label}
              </Link>
            ) : null}
            {quiet ? (
              <Link to={quiet.to} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-primary underline-offset-4 hover:underline">
                {quiet.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
