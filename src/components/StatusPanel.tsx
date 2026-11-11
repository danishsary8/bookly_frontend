import type { ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Seal } from "@/components/shopping/Seal";
import { cn } from "@/lib/utils";

/*
 * One centred sheet for the small "a link from an email did something" pages (pages/content.md): newsletter
 * confirm / unsubscribe, stop cart reminders. Loading: a spinner; success: the Seal that draws its check; error:
 * a soft destructive disc with an alert icon. Gloock title (400, never bold), one sentence, the actions.
 */
export function StatusPanel({ tone, title, children, actions }: { tone: "loading" | "success" | "error"; title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="container-shell flex min-h-[62vh] items-center justify-center py-16">
      <div aria-live="polite" className="shop-card relative isolate grid w-full max-w-lg justify-items-center gap-4 overflow-hidden rounded-3xl border border-border bg-card px-6 py-12 text-center sm:px-12">
        <span className="pointer-events-none absolute -top-24 left-1/2 -z-10 size-72 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--primary)_9%,transparent),transparent)]" aria-hidden="true" />
        {tone === "loading" ? (
          <span className="grid size-16 place-items-center rounded-full bg-lapis-tint text-primary">
            <Loader2 className="size-7 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          </span>
        ) : tone === "success" ? (
          <Seal />
        ) : (
          <span className="grid size-16 place-items-center rounded-full bg-destructive-tint text-destructive">
            <AlertCircle className="size-8" strokeWidth={1.75} aria-hidden="true" />
          </span>
        )}
        <h1 className="font-display text-[2rem] leading-tight">{title}</h1>
        {children ? <div className={cn("max-w-sm text-[15px] leading-relaxed text-muted-foreground")}>{children}</div> : null}
        {actions ? <div className="mt-3 flex flex-wrap justify-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
